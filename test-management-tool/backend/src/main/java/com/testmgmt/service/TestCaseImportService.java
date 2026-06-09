package com.testmgmt.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmgmt.dto.response.ResponseDTOs.ImportErrorItem;
import com.testmgmt.dto.response.ResponseDTOs.ImportResultResponse;
import com.testmgmt.entity.ExcelImportLog;
import com.testmgmt.entity.Module;
import com.testmgmt.entity.Project;
import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.User;
import com.testmgmt.enums.Priority;
import com.testmgmt.enums.TestStatus;
import com.testmgmt.exception.BadRequestException;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.ExcelImportLogRepository;
import com.testmgmt.repository.ModuleRepository;
import com.testmgmt.repository.ProjectRepository;
import com.testmgmt.repository.TestCaseRepository;
import com.testmgmt.repository.TestStepRepository;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Handles Excel import/export of test cases.
 * Import format mirrors the GWG project Excel:
 *   Col 0  = Track  (maps to sub-project or ignored)
 *   Col 1  = Module
 *   Col 2  = Sub Module
 *   Col 3  = Sub Module1/Variant
 *   Col 4  = Sub Module2/Channel
 *   Col 5  = Scenario Description
 *   Col 6  = Test Case ID  (e.g. GWG-NB-001)
 *   Col 7  = Test Case Description
 *   Col 8  = Functional Expected Result
 *   Col 13 = QA (assigned tester name)
 *   Col 14 = Status (Pass/Fail/In Progress/NA/Not released/…)
 *
 * Export (template download): returns ALL test cases for the project as Excel.
 */
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
@Slf4j
public class TestCaseImportService {

    private static final int MAX_ROWS = 5000;

    // GWG Excel column indices (0-based)
    private static final int COL_MODULE      = 1;
    private static final int COL_SUBMODULE   = 2;
    private static final int COL_SCENARIO    = 5;
    private static final int COL_TC_ID       = 6;
    private static final int COL_TC_DESC     = 7;
    private static final int COL_EXPECTED    = 8;
    private static final int COL_STATUS      = 14;

    private final TestCaseRepository       testCaseRepository;
    private final TestStepRepository       testStepRepository;
    private final ProjectRepository        projectRepository;
    private final ModuleRepository         moduleRepository;
    private final ExcelImportLogRepository importLogRepository;
    private final UserRepository           userRepository;
    private final ObjectMapper             objectMapper;

    // ── Import ────────────────────────────────────────────────────────────────

    @Transactional
    public ImportResultResponse importFromExcel(UUID projectId, MultipartFile file, String importerEmail) {
        if (file.isEmpty()) throw new BadRequestException("Upload file is empty");
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx"))
            throw new BadRequestException("Only .xlsx files are supported");

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        User importer = userRepository.findByEmail(importerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", importerEmail));

        List<ImportErrorItem> errors = new ArrayList<>();
        int successCount = 0, totalRows = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            // Try the "Data" sheet first (GWG format), fall back to sheet 0
            Sheet sheet = workbook.getSheet("Data");
            if (sheet == null) sheet = workbook.getSheetAt(0);
            if (sheet == null) throw new BadRequestException("Excel file contains no sheets");

            int lastRow = sheet.getLastRowNum();
            if (lastRow > MAX_ROWS)
                throw new BadRequestException("File has " + lastRow + " rows. Maximum allowed is " + MAX_ROWS);

            // Detect format: GWG (col 6 = TC ID) vs simple template (col 0 = module)
            Row headerRow = sheet.getRow(0);
            boolean isGwgFormat = isGwgFormat(headerRow);
            log.info("Importing {} rows from {} (format: {})", lastRow, filename,
                    isGwgFormat ? "GWG" : "simple");

            Map<String, TestCase> codeToCase = new LinkedHashMap<>();

            for (int rowNum = 1; rowNum <= lastRow; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowBlank(row)) continue;
                totalRows++;
                try {
                    if (isGwgFormat) {
                        successCount += importGwgRow(row, rowNum, project, importer,
                                codeToCase, errors);
                    } else {
                        successCount += importSimpleRow(row, rowNum, project, importer,
                                codeToCase, errors);
                    }
                } catch (Exception e) {
                    errors.add(ImportErrorItem.builder()
                            .row(rowNum + 1).column("—").message(e.getMessage()).build());
                }
            }

            ExcelImportLog log2 = ExcelImportLog.builder()
                    .project(project).importedBy(importer).fileName(filename)
                    .rowCount(totalRows).successCount(successCount).errorCount(errors.size())
                    .errors(errors.isEmpty() ? "[]" : objectMapper.writeValueAsString(errors))
                    .importedAt(Instant.now()).build();
            ExcelImportLog saved = importLogRepository.save(log2);

            return ImportResultResponse.builder()
                    .importLogId(saved.getId()).totalRows(totalRows)
                    .successCount(successCount).errorCount(errors.size())
                    .errors(errors).build();

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Excel import failed for project {}", projectId, e);
            throw new BadRequestException("Failed to process Excel file: " + e.getMessage());
        }
    }

    /** Import one GWG-format row; returns 1 if a new TC was created, 0 if duplicate updated. */
    private int importGwgRow(Row row, int rowNum, Project project, User importer,
                             Map<String, TestCase> codeToCase, List<ImportErrorItem> errors) {
        // Read all relevant GWG columns
        String moduleName  = getCellStr(row, COL_MODULE);
        String subModName  = getCellStr(row, COL_SUBMODULE);
        String tcId        = getCellStr(row, COL_TC_ID);
        String tcDesc      = getCellStr(row, COL_TC_DESC);
        String expectedResult = getCellStr(row, COL_EXPECTED);
        String statusStr   = getCellStr(row, COL_STATUS);
        String scenario    = getCellStr(row, COL_SCENARIO);

        // Skip completely empty rows (no TC ID and no description)
        if (tcId.isBlank() && tcDesc.isBlank() && scenario.isBlank()) return 0;

        String code = tcId.isBlank() ? null : tcId.trim();

        // Resolve module/sub-module hierarchy from Excel columns B and C
        Module module = resolveModuleHierarchy(project, moduleName, subModName);

        // Map Excel status string → TestStatus enum
        TestStatus status = mapExcelStatus(statusStr);

        // Check for existing TC: in-memory map first, then DB
        TestCase tc = code != null ? codeToCase.get(code) : null;
        if (tc == null && code != null) {
            tc = testCaseRepository.findByCode(code).orElse(null);
        }

        if (tc == null) {
            // Build title from description, fallback to scenario, fallback to TC ID
            String title = !tcDesc.isBlank() ? tcDesc
                         : !scenario.isBlank() ? scenario
                         : tcId;
            String finalCode = (code != null && !code.isBlank()) ? code
                    : String.format("TC-%04d",
                            testCaseRepository.findMaxCodeSequence() + codeToCase.size() + 1);

            tc = TestCase.builder()
                    .code(finalCode)
                    .title(truncate(title, 255))
                    .description(!tcDesc.isBlank() ? tcDesc : null)
                    .preconditions(!scenario.isBlank() ? scenario : null)
                    .project(project)
                    .module(module)
                    .priority(Priority.MEDIUM)
                    .status(status)
                    .createdBy(importer)
                    .build();
            tc = testCaseRepository.save(tc);

            // Save expected result as the first TestStep so it is visible on the TC detail page
            if (!expectedResult.isBlank()) {
                com.testmgmt.entity.TestStep step = com.testmgmt.entity.TestStep.builder()
                        .testCase(tc)
                        .stepNumber(1)
                        .stepAction("Execute test case as described")
                        .expectedResult(truncate(expectedResult, 1000))
                        .build();
                testStepRepository.save(step);
            }

            if (code != null && !code.isBlank()) codeToCase.put(code, tc);
            return 1;
        } else {
            // Update existing TC: refresh status and module from latest Excel row
            boolean changed = false;
            if (status != TestStatus.DRAFT) {
                tc.setStatus(status);
                changed = true;
            }
            if (module != null && tc.getModule() == null) {
                tc.setModule(module);
                changed = true;
            }
            if (changed) testCaseRepository.save(tc);
            return 0;
        }
    }

    /** Import one simple-template-format row. */
    private int importSimpleRow(Row row, int rowNum, Project project, User importer,
                                Map<String, TestCase> codeToCase, List<ImportErrorItem> errors) {
        String moduleName = requireCell(row, 0, "product_module", rowNum, errors);
        String title      = requireCell(row, 1, "test_case_title", rowNum, errors);
        if (moduleName == null || title == null) return 0;

        String priorityStr = getCellStr(row, 4);
        Priority priority;
        try {
            priority = priorityStr.isBlank() ? Priority.MEDIUM
                    : Priority.valueOf(priorityStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            errors.add(ImportErrorItem.builder().row(rowNum + 1).column("priority")
                    .message("Invalid priority: " + priorityStr).build());
            return 0;
        }

        Module module = resolveModule(project, moduleName.trim());
        TestCase tc = codeToCase.get(title);
        if (tc == null) {
            if (testCaseRepository.existsByTitleAndProject(title, project)) {
                errors.add(ImportErrorItem.builder().row(rowNum + 1).column("test_case_title")
                        .message("Duplicate title: '" + title + "'").build());
                return 0;
            }
            String code = String.format("TC-%04d",
                    testCaseRepository.findMaxCodeSequence() + codeToCase.size() + 1);
            tc = TestCase.builder()
                    .code(code).title(title)
                    .description(getCellStr(row, 2))
                    .preconditions(getCellStr(row, 3))
                    .project(project).module(module)
                    .priority(priority).status(TestStatus.DRAFT)
                    .createdBy(importer).build();
            tc = testCaseRepository.save(tc);
            codeToCase.put(title, tc);
            return 1;
        }
        return 0;
    }

    // ── Export — download ALL test cases as Excel ─────────────────────────────

    /**
     * Generates an Excel file containing ALL test cases for the project.
     * Format mirrors the GWG Excel structure.
     */
    public byte[] exportTestCases(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        List<TestCase> cases = testCaseRepository.findByProject(project);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Test Cases");

            // ── Styles ────────────────────────────────────────────────────────
            XSSFCellStyle headerStyle = workbook.createCellStyle();
            XSSFFont hFont = workbook.createFont();
            hFont.setBold(true); hFont.setFontHeightInPoints((short) 10);
            hFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(hFont);
            headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)31,(byte)73,(byte)125}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            XSSFCellStyle wrapStyle = workbook.createCellStyle();
            wrapStyle.setWrapText(true);
            wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

            XSSFCellStyle passStyle  = statusStyle(workbook, new byte[]{(byte)198,(byte)239,(byte)206});
            XSSFCellStyle failStyle  = statusStyle(workbook, new byte[]{(byte)255,(byte)199,(byte)206});
            XSSFCellStyle naStyle    = statusStyle(workbook, new byte[]{(byte)255,(byte)242,(byte)204});
            XSSFCellStyle ipStyle    = statusStyle(workbook, new byte[]{(byte)221,(byte)235,(byte)247});
            XSSFCellStyle nrStyle    = statusStyle(workbook, new byte[]{(byte)242,(byte)220,(byte)219});

            // ── Header row ────────────────────────────────────────────────────
            String[] headers = {
                "Track / Sub-Project", "Module", "Sub Module",
                "Test Case ID", "Test Case Description",
                "Expected Result", "Priority", "Status",
                "Assigned QA", "Defect Ref", "Execution Date"
            };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }
            headerRow.setHeightInPoints(20);

            // ── Column widths ─────────────────────────────────────────────────
            int[] widths = {4500, 5000, 5500, 3500, 12000, 12000, 3000, 4000, 4500, 3500, 4500};
            for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i]);

            // ── Data rows ─────────────────────────────────────────────────────
            DateTimeFormatter dtFmt = DateTimeFormatter.ofPattern("dd-MMM-yyyy")
                    .withZone(ZoneId.systemDefault());

            int rowNum = 1;
            for (TestCase tc : cases) {
                Row row = sheet.createRow(rowNum++);
                row.setHeightInPoints(40);

                setCell(row, 0, tc.getProject().getName(), wrapStyle);
                setCell(row, 1, tc.getModule() != null ? tc.getModule().getName() : "", wrapStyle);
                setCell(row, 2, tc.getModule() != null && tc.getModule().getParentModule() != null
                        ? tc.getModule().getParentModule().getName() : "", wrapStyle);
                setCell(row, 3, tc.getCode(), null);
                setCell(row, 4, tc.getTitle(), wrapStyle);
                String expectedResult = tc.getSteps() != null && !tc.getSteps().isEmpty()
                        ? tc.getSteps().get(0).getExpectedResult() : "";
                setCell(row, 5, expectedResult, wrapStyle);
                setCell(row, 6, tc.getPriority() != null ? tc.getPriority().name() : "MEDIUM", null);

                // Status cell with colour coding
                Cell statusCell = row.createCell(7);
                String statusLabel = formatStatus(tc.getStatus());
                statusCell.setCellValue(statusLabel);
                XSSFCellStyle sStyle = switch (tc.getStatus()) {
                    case PASSED         -> passStyle;
                    case FAILED, DEFECT_RAISED -> failStyle;
                    case NA             -> naStyle;
                    case IN_PROGRESS, RETEST -> ipStyle;
                    case NOT_RELEASED   -> nrStyle;
                    default             -> wrapStyle;
                };
                statusCell.setCellStyle(sStyle);

                String testerName = tc.getAssignedTo() != null
                        ? (tc.getAssignedTo().getFullName() != null
                                ? tc.getAssignedTo().getFullName()
                                : tc.getAssignedTo().getUsername())
                        : "";
                setCell(row, 8, testerName, null);
                setCell(row, 9, "", null);  // Defect Ref (blank — filled by QA)
                setCell(row, 10, tc.getUpdatedAt() != null ? dtFmt.format(tc.getUpdatedAt()) : "", null);
            }

            // Freeze header row
            sheet.createFreezePane(0, 1);
            // Auto-filter
            sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate export: " + e.getMessage(), e);
        }
    }

    /** Generates a blank import template (simple format). */
    public byte[] generateTemplate() {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Test Cases");

            XSSFCellStyle headerStyle = workbook.createCellStyle();
            XSSFFont font = workbook.createFont();
            font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(
                    new XSSFColor(new byte[]{(byte)31,(byte)73,(byte)125}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // GWG-format header columns
            String[] columns = {
                "Track", "Module", "Sub Module", "Sub Module1/Variant", "Sub Module2/Channel",
                "Scenario Description", "Test Case ID", "Test Case Description",
                "Expected Result", "Finance Expected Result", "Functional/Finance",
                "Product", "Policy Number", "QA",
                "Status (Pass/Fail/In Progress/NA/Not released)", "Execution Date", "Defect Ref"
            };
            Row header = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, i < 6 ? 4000 : i == 7 ? 10000 : 5000);
            }

            // Sample row
            String[] sample = {
                "NB", "QC", "Minimum entry age", "QC Validation", "Variant 1- Wealth Creation",
                "To check minimum entry age for IP != PH", "GWG-NB-001",
                "To verify Minimum Entry age with given condition",
                "System should allow to validate the application", "", "", "Guaranteed Wealth Goal",
                "", "Pallavi Gunjal", "Pass", "26-May-2026", ""
            };
            Row ex = sheet.createRow(1);
            for (int i = 0; i < sample.length; i++) ex.createCell(i).setCellValue(sample[i]);

            sheet.createFreezePane(0, 1);
            sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, columns.length - 1));

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate template: " + e.getMessage(), e);
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /** Detect GWG format by checking column 6 header = "New test case id" or similar */
    private boolean isGwgFormat(Row headerRow) {
        if (headerRow == null) return false;
        String col6 = getCellStr(headerRow, 6).toLowerCase();
        String col1 = getCellStr(headerRow, 1).toLowerCase();
        return col6.contains("test case") || col6.contains("tc") || col6.contains("id")
                || col1.contains("module");
    }

    /** Resolve or create: Module → SubModule hierarchy */
    private Module resolveModuleHierarchy(Project project, String moduleName, String subModName) {
        if (moduleName == null || moduleName.isBlank()) return null;
        Module parent = resolveModule(project, moduleName.trim());
        if (subModName == null || subModName.isBlank()) return parent;
        return moduleRepository
                .findByNameAndProjectAndParentModule(subModName.trim(), project, parent)
                .orElseGet(() -> moduleRepository.save(
                        Module.builder().name(subModName.trim())
                                .project(project).parentModule(parent).build()));
    }

    private Module resolveModule(Project project, String name) {
        return moduleRepository.findByNameAndProject(name, project)
                .orElseGet(() -> moduleRepository.save(
                        Module.builder().name(name).project(project).build()));
    }

    /** Map Excel status strings to TestStatus enum */
    private TestStatus mapExcelStatus(String raw) {
        if (raw == null || raw.isBlank()) return TestStatus.DRAFT;
        return switch (raw.trim().toLowerCase()) {
            case "pass", "passed"                     -> TestStatus.PASSED;
            case "fail", "failed"                     -> TestStatus.FAILED;
            case "in progress", "inprogress"          -> TestStatus.IN_PROGRESS;
            case "na", "n/a"                          -> TestStatus.NA;
            case "not released", "not_released", "not release" -> TestStatus.NOT_RELEASED;
            case "defect raised", "underdefect",
                 "under defect", "defect"             -> TestStatus.DEFECT_RAISED;
            case "blocked"                            -> TestStatus.UNDER_REVIEW;
            case "retest"                             -> TestStatus.RETEST;
            case "pending for execution", "pending",
                 "assigned"                           -> TestStatus.ASSIGNED;
            case "cr", "duplicate"                    -> TestStatus.DEPRECATED;
            default                                   -> TestStatus.DRAFT;
        };
    }

    private String formatStatus(TestStatus s) {
        if (s == null) return "Draft";
        return switch (s) {
            case PASSED        -> "Pass";
            case FAILED        -> "Fail";
            case IN_PROGRESS   -> "In Progress";
            case NA            -> "NA";
            case NOT_RELEASED  -> "Not Released";
            case DEFECT_RAISED -> "Defect Raised";
            case RETEST        -> "Retest";
            case ASSIGNED      -> "Assigned";
            case UNDER_REVIEW  -> "Blocked";
            default            -> s.name().replace('_', ' ');
        };
    }

    private XSSFCellStyle statusStyle(XSSFWorkbook wb, byte[] rgb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(rgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private void setCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        if (style != null) cell.setCellStyle(style);
    }

    private String getCellStr(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toLocalDate().toString()
                    : String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield cell.getStringCellValue().trim(); }
                catch (Exception e) {
                    try { yield String.valueOf((long) cell.getNumericCellValue()); }
                    catch (Exception e2) { yield ""; }
                }
            }
            default -> "";
        };
    }

    private String requireCell(Row row, int col, String field,
                               int rowNum, List<ImportErrorItem> errors) {
        String val = getCellStr(row, col);
        if (val.isBlank()) {
            errors.add(ImportErrorItem.builder()
                    .row(rowNum + 1).column(field)
                    .message(field + " is required").build());
            return null;
        }
        return val;
    }

    private boolean isRowBlank(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK
                    && !getCellStr(row, c).isBlank()) return false;
        }
        return true;
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max - 3) + "...";
    }
}
