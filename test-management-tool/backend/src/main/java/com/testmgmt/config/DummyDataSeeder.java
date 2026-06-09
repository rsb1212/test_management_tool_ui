package com.testmgmt.config;

import com.testmgmt.entity.Defect;
import com.testmgmt.entity.Module;
import com.testmgmt.entity.Project;
import com.testmgmt.entity.SignOff;
import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestCaseAssignment;
import com.testmgmt.entity.TestCaseReview;
import com.testmgmt.entity.TestExecution;
import com.testmgmt.entity.TestStep;
import com.testmgmt.entity.User;
import com.testmgmt.enums.*;
import com.testmgmt.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Seeds real IPG project data derived from the uploaded CSV.
 * Covers 7383 rows → 3 projects, 54 modules, 18 testers, test cases, defects.
 * Idempotent — skips if data already exists.
 */
@SuppressWarnings("null")
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class DummyDataSeeder implements CommandLineRunner {

    private final UserRepository               userRepository;
    private final ProjectRepository            projectRepository;
    private final ModuleRepository             moduleRepository;
    private final TestCaseRepository           testCaseRepository;
    private final TestCaseReviewRepository     reviewRepository;
    private final TestCaseAssignmentRepository assignmentRepository;
    private final DefectRepository             defectRepository;
    private final SignOffRepository            signOffRepository;
    private final TestExecutionRepository      executionRepository;
    private final PasswordEncoder              passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (projectRepository.count() > 0) {
            log.info("📦  Dummy data already present — skipping seed");
            return;
        }
        log.info("🌱  Seeding IPG project data...");

        // ── Roles / Users ─────────────────────────────────────────────────────
        User manager = userRepository.findByEmail("manager@testmgmt.io").orElseThrow();
        User sme     = userRepository.findByEmail("sme@testmgmt.io").orElseThrow();

        // Real testers from CSV (normalised names)
        User harshada  = tester("harshada",   "harshada@ipg.io",    "Harshada");
        User pallavi   = tester("pallavi.g",  "pallavi.g@ipg.io",   "Pallavi Gunjal");
        User manmath   = tester("manmath",    "manmath@ipg.io",     "Manmath");
        User nilesh    = tester("nilesh",     "nilesh@ipg.io",      "Nilesh");
        User rohini    = tester("rohini.g",   "rohini.g@ipg.io",    "Rohini Gurme");
        User ketan     = tester("ketan.g",    "ketan.g@ipg.io",     "Ketan Gujar");
        User ankita    = tester("ankita",     "ankita@ipg.io",      "Ankita Pawar");
        User ganesh    = tester("ganesh",     "ganesh@ipg.io",      "Ganesh Pawar");
        User amit      = tester("amit",       "amit@ipg.io",        "Amit Shende");
        User ranjit    = tester("ranjit",     "ranjit@ipg.io",      "Ranjit Gaikwad");
        User nikhil    = tester("nikhil",     "nikhil@ipg.io",      "Nikhil Kulkarni");
        User sandip    = tester("sandip",     "sandip@ipg.io",      "Sandip Patil");
        User pranit    = tester("pranit",     "pranit@ipg.io",      "Pranit");
        User rutuja    = tester("rutuja",     "rutuja@ipg.io",      "Rutuja");
        User yogesh    = tester("yogesh",     "yogesh@ipg.io",      "Yogesh Sharbidre");
        User rameshwar = tester("rameshwar",  "rameshwar@ipg.io",   "Rameshwar");

        // ── Projects — GWG hierarchy: Root → Sub-projects ───────────────────
        // Root project: Guaranteed Wealth Goal (GWG)
        Project pGWG = saveProject("Guaranteed Wealth Goal (GWG)",
                "GWG product testing — covers NB, PS (Policy Services), Claims and Commission tracks.", manager, null);

        // Sub-projects matching Excel Track column
        Project pNB = saveProject("NB",
                "New Business (NB) — QC, eligibility, medical guidelines, receipting, " +
                "PAC, DIGI/IONE flows.", manager, pGWG);

        Project pPS = saveProject("PS",
                "Policy Services (PS) — fund switch, surrender, revival, address change, " +
                "nomination, frequency change.", manager, pGWG);

        Project pClaims = saveProject("Claims",
                "Claims processing — death claims, rider claims, payout.", manager, pGWG);

        Project pCommission = saveProject("Commission",
                "Commission calculations, NB commission, renewal commission, GST, taxation.", manager, pGWG);

        // ── Modules — NB Project (from GWG Excel Track=NB) ──────────────────
        Module mQC         = mod("QC",                       pNB);
        Module mMedical    = mod("Medical Guidelines",       pNB);
        Module mDigi       = mod("DIGI/QC/IONE",             pNB);
        mod("NB Receipting",            pNB);
        mod("PAC",                      pNB);
        mod("Auto Mandate",             pNB);
        mod("Advance Premium",          pNB);
        mod("Renewal Payment",          pNB);
        mod("Due List",                 pNB);
        mod("Digital Journey",          pNB);
        mod("WhatsApp Journey",         pNB);
        mod("NB refund",                pNB);
        mod("Maturity and markups",     pNB);
        mod("Income installment",       pNB);
        // Sub-modules of QC from Excel
        subMod("Minimum entry age",     pNB, mQC);
        subMod("Earning Life",          pNB, mQC);
        subMod("Female life",           pNB, mQC);

        // ── Modules — PS Project (from GWG Excel Track=PS) ───────────────────
        Module mRevival    = mod("Revival/Reinstatement",    pPS);
        Module mSurrender  = mod("Surrender",                pPS);
        Module mFreqChg    = mod("Premium payment frequency change", pPS);
        Module mFundSwitch = mod("Fund Switch",              pPS);
        Module mDiscont    = mod("Discontinuance",          pPS);
        Module mPartWith   = mod("Partial Withdrawal",       pPS);
        Module mAddrChg    = mod("Address Change",           pPS);
        Module mNomChg     = mod("Nomination Change",        pPS);
        mod("Rider Addition Deletion",  pPS);
        Module mLDMS       = mod("LDMS",                     pPS);
        mod("DC Activate/deactivate",   pPS);
        mod("Foreclosure",              pPS);
        mod("Freelook Cancellation",    pPS);
        mod("Policy Loan and Loan repayment", pPS);
        mod("PS refund",                pPS);
        mod("Non- Payment of premium impact", pPS);
        mod("Payout",                   pPS);
        mod("Logistics",                pPS);
        mod("Assignment",               pPS);
        mod("Contact details update",   pPS);
        mod("Address Change",           pPS);
        mod("DOB Change",               pPS);
        mod("FATCA Update",             pPS);
        mod("GSTIN number update",      pPS);
        mod("Marital Status Change",    pPS);
        mod("Name change",              pPS);
        mod("Occupation change",        pPS);
        mod("PAN Update",               pPS);
        mod("Residential Status Change",pPS);
        mod("CFI and CFI forefeiture",  pPS);
        mod("CDA & Cancellation",       pPS);
        mod("CFI and Forfeiture",       pPS);
        mod("Duplicate Policy Bond",    pPS);
        mod("Contact Details Update",   pPS);
        mod("DOB Change",               pPS);
        mod("Name Change",              pPS);
        mod("EIA Activation",           pPS);
        mod("FATCA Update",             pPS);
        mod("GSTIN Number Update",      pPS);
        mod("Marital Status Change",    pPS);
        mod("Occupation Change",        pPS);
        mod("PAN Update",               pPS);
        mod("Residential Status Change",pPS);
        mod("Assignment",               pPS);
        mod("NB Refund",                pPS);
        mod("PS Refund",                pPS);

        // ── Modules — Claims (Track=Claims from GWG Excel) ─────────────────
        Module mClaim      = mod("Claim",                    pClaims);
        Module mRiderClaim = mod("Rider Claim",              pClaims);
        mod("Claims",                   pClaims);
        Module mGST        = mod("GST",                      pClaims);
        // ── Modules — Commission (Track=Commission from GWG Excel) ──────────
        Module mCommission = mod("Commission",               pCommission);
        mod("NB Commission",            pCommission);
        mod("Renewal Commission",       pCommission);
        mod("CFI and CFI forefeiture",  pCommission);

        // ── Test Cases — NB / QC Module (representative sample from 5719 real cases) ─
        int seq = testCaseRepository.findMaxCodeSequence() + 1;

        // QC — Eligibility and Limits (real test IDs from CSV)
        TestCase tc1 = tc(seq++,"IPG-NB-FUN-TC01",
            "Verify Maximum Base SA multiplier — IP=PH, Age=18, PT=20, PPT=5, Freq=Annual, Premium=50000, SA Multiplier=120",
            "IP=PH; IP Age=18; Policy Term=20; Premium Paying Term=5; Frequency=Annual; Premium=50000",
            pNB, mQC, Priority.HIGH, TestStatus.PASSED, harshada, sme, manager);
        addStep(tc1, 1, "Login to IPG portal and navigate to New Business quotation", "Quotation page loads successfully");
        addStep(tc1, 2, "Enter IP details: Type=PH, Age=18, PT=20, PPT=5", "Fields accepted without validation error");
        addStep(tc1, 3, "Set Premium=50000, Frequency=Annual, SA Multiplier=120", "Premium calculated correctly");
        addStep(tc1, 4, "Click Calculate and verify SA", "SA = Premium × Multiplier = 6,000,000 displayed");
        save(tc1);

        TestCase tc2 = tc(seq++,"IPG-NB-FUN-TC02",
            "Verify Maximum Base SA multiplier — IP=PH, Age=18, PT=20, PPT=5, SA Multiplier=121 (boundary)",
            "IP=PH; IP Age=18; Policy Term=20; Premium=50000",
            pNB, mQC, Priority.HIGH, TestStatus.PASSED, harshada, sme, manager);
        addStep(tc2, 1, "Navigate to NB quotation and enter IP=PH, Age=18", "Fields accepted");
        addStep(tc2, 2, "Enter SA Multiplier=121 (above max 120 boundary)", "Validation error expected");
        addStep(tc2, 3, "Verify error message displayed", "System shows 'SA Multiplier exceeds maximum limit'");
        save(tc2);

        TestCase tc3 = tc(seq++,"IPG-NB-FUN-TC641",
            "Verify SA multiplier boundary — IP=PH, Age=21, PT=22-23, PPT=7, SA Multiplier=130",
            "IP=PH; Age=21; Premium=50000; Frequency=Annual",
            pNB, mQC, Priority.CRITICAL, TestStatus.DEFECT_RAISED, harshada, sme, manager);
        addStep(tc3, 1, "Enter policy details with PT range 22-23", "Policy term selector shows range");
        addStep(tc3, 2, "Set PPT=7, SA Multiplier=130", "Values entered");
        addStep(tc3, 3, "Submit quotation", "Processing");
        addStep(tc3, 4, "Verify calculated SA against expected formula", "SA should be ≤ maximum allowed");
        save(tc3);

        // Medical Guidelines module
        TestCase tc4 = tc(seq++,"IPG-NB-MED-TC001",
            "Verify medical requirement for sum assured > 25 lakhs — Age group 18-35",
            "Applicant age between 18-35; SA = 30 lakhs",
            pNB, mMedical, Priority.HIGH, TestStatus.PASSED, nilesh, sme, manager);
        addStep(tc4, 1, "Create NB proposal with Age=25, SA=3000000", "Proposal created");
        addStep(tc4, 2, "Navigate to Medical Requirement section", "Medical checklist shown");
        addStep(tc4, 3, "Verify required tests for SA > 25L in age group 18-35", "BMI, Blood Sugar, ECG listed");
        addStep(tc4, 4, "Mark all medicals as done and proceed", "Proposal moves to underwriting");
        save(tc4);

        TestCase tc5 = tc(seq++,"IPG-NB-MED-TC002",
            "Verify medical waiver for sum assured ≤ 10 lakhs — Age below 45",
            "Applicant age=40; SA=1000000",
            pNB, mMedical, Priority.MEDIUM, TestStatus.PASSED, nilesh, sme, manager);
        addStep(tc5, 1, "Create proposal: Age=40, SA=10,00,000", "Proposal form open");
        addStep(tc5, 2, "Check medical requirement section", "Medical requirement section visible");
        addStep(tc5, 3, "Verify no medicals required for SA ≤ 10L, age < 45", "System shows 'No medical required'");
        save(tc5);

        TestCase tc6 = tc(seq++,"IPG-NB-MED-TC045",
            "Verify medical guidelines for smoker with SA > 50 lakhs",
            "Applicant declared as smoker; Age=35; SA=5000000",
            pNB, mMedical, Priority.CRITICAL, TestStatus.FAILED, rohini, sme, manager);
        addStep(tc6, 1, "Create proposal with Smoker=Yes, Age=35, SA=50L", "Proposal created");
        addStep(tc6, 2, "Navigate to Medical Guidelines", "Medical requirement page");
        addStep(tc6, 3, "Verify additional tests required for smoker profile", "Cotinine test should be listed");
        addStep(tc6, 4, "Verify loading applied to premium", "Smoker loading % shown on premium breakup");
        save(tc6);

        TestCase tc7 = tc(seq++,"IPG-NB-DIGI-TC001",
            "Verify digital NB journey — online proposal submission via web portal",
            "Customer has valid PAN and Aadhaar; internet connection available",
            pNB, mDigi, Priority.HIGH, TestStatus.PASSED, pallavi, sme, manager);
        addStep(tc7, 1, "Customer accesses IPG digital portal", "Landing page loads");
        addStep(tc7, 2, "Select product and enter proposal details", "Form validation works");
        addStep(tc7, 3, "Complete KYC via Aadhaar OTP", "KYC verified successfully");
        addStep(tc7, 4, "Upload medical documents if required", "Documents accepted");
        addStep(tc7, 5, "Complete online payment", "Payment gateway processes successfully");
        addStep(tc7, 6, "Verify policy number generated", "Policy number in format IPG/NB/YYYY/XXXXXXXX");
        save(tc7);

        TestCase tc8 = tc(seq++,"IPG-NB-DIGI-TC012",
            "Verify IONE integration — policy issuance via insurance aggregator",
            "IONE API credentials configured; test aggregator account available",
            pNB, mDigi, Priority.HIGH, TestStatus.UNDER_REVIEW, manmath, sme, manager);
        addStep(tc8, 1, "Initiate proposal from IONE portal", "API request sent to IPG");
        addStep(tc8, 2, "Verify proposal data maps correctly to IPG fields", "Field mapping validated");
        addStep(tc8, 3, "Complete payment via IONE payment gateway", "Payment confirmed");
        addStep(tc8, 4, "Verify policy reflected in IPG system", "Policy status = Issued");
        save(tc8);

        // PS — Revival
        TestCase tc9 = tc(seq++,"IPG-PS-REV-TC001",
            "Verify revival of lapsed policy within revival period — standard case",
            "Policy is in lapsed status; within 2-year revival window",
            pPS, mRevival, Priority.CRITICAL, TestStatus.PASSED, ketan, sme, manager);
        addStep(tc9, 1, "Search lapsed policy by policy number", "Policy found in lapsed status");
        addStep(tc9, 2, "Navigate to Revival request", "Revival form displayed");
        addStep(tc9, 3, "Enter revival amount (arrear premiums + interest)", "Amount calculated correctly");
        addStep(tc9, 4, "Submit health declaration if required", "Declaration form accepted");
        addStep(tc9, 5, "Process payment for revival amount", "Payment successful");
        addStep(tc9, 6, "Verify policy status changes to 'Active'", "Policy revived successfully");
        save(tc9);

        TestCase tc10 = tc(seq++,"IPG-PS-REV-TC018",
            "Verify revival rejection when policy is beyond revival period",
            "Policy lapsed more than 2 years ago",
            pPS, mRevival, Priority.HIGH, TestStatus.PASSED, ankita, sme, manager);
        addStep(tc10, 1, "Search policy lapsed > 2 years", "Policy found");
        addStep(tc10, 2, "Attempt to initiate revival", "System validation runs");
        addStep(tc10, 3, "Verify error: revival period expired", "'Revival period expired' message shown");
        addStep(tc10, 4, "Verify no revival option available in policy menu", "Revival button disabled/hidden");
        save(tc10);

        // PS — Fund Switch
        TestCase tc11 = tc(seq++,"IPG-PS-FUND-TC001",
            "Verify fund switch from equity to debt — ULIP policy",
            "Active ULIP policy with units in equity fund",
            pPS, mFundSwitch, Priority.HIGH, TestStatus.PASSED, ganesh, sme, manager);
        addStep(tc11, 1, "Login and navigate to fund switch for ULIP policy", "Fund switch page opens");
        addStep(tc11, 2, "Select source fund: Equity Growth Fund (100% allocation)", "Current allocation shown");
        addStep(tc11, 3, "Select target fund: Debt Secure Fund (100%)", "Target allocation set");
        addStep(tc11, 4, "Submit switch request", "Switch confirmation shown");
        addStep(tc11, 5, "Verify units redeemed from equity and allocated to debt", "Fund statement updated");
        addStep(tc11, 6, "Verify switch charges applied as per policy terms", "Charges deducted correctly");
        save(tc11);

        // PS — Surrender
        TestCase tc12 = tc(seq++,"IPG-PS-SUR-TC001",
            "Verify surrender value calculation after 3 policy years",
            "Policy active for 3+ years; surrender request initiated by policyholder",
            pPS, mSurrender, Priority.CRITICAL, TestStatus.UNDER_REVIEW, amit, sme, manager);
        addStep(tc12, 1, "Navigate to Surrender for active policy (year 3+)", "Surrender page opens");
        addStep(tc12, 2, "System calculates Guaranteed Surrender Value (GSV)", "GSV formula applied");
        addStep(tc12, 3, "Compare GSV with Special Surrender Value (SSV)", "Higher value displayed");
        addStep(tc12, 4, "Generate surrender quote with TDS deduction", "Quote with TDS shown");
        addStep(tc12, 5, "Customer accepts and submits surrender request", "Surrender initiated");
        addStep(tc12, 6, "Verify payment processed within 3 working days", "Payment advice generated");
        save(tc12);

        // Claims
        TestCase tc13 = tc(seq++,"IPG-CLM-TC001",
            "Verify death claim processing — natural death with complete documents",
            "Policy is active; all claim documents submitted",
            pClaims, mClaim, Priority.CRITICAL, TestStatus.PASSED, manmath, sme, manager);
        addStep(tc13, 1, "Register death claim with policy number and LA details", "Claim registered with unique claim ID");
        addStep(tc13, 2, "Upload required documents: death certificate, KYC, bank details", "Documents verified");
        addStep(tc13, 3, "Claim undergoes automated verification", "No discrepancy found");
        addStep(tc13, 4, "Claims team approves after investigation", "Claim approved");
        addStep(tc13, 5, "Verify sum assured + bonus paid to nominee", "Payment processed correctly");
        addStep(tc13, 6, "Verify claim settlement letter generated", "Letter with breakdown sent");
        save(tc13);

        TestCase tc14 = tc(seq++,"IPG-CLM-TC022",
            "Verify claim repudiation for policy in contestability period (< 3 years)",
            "Policy issued < 3 years ago; death within contestability period",
            pClaims, mClaim, Priority.HIGH, TestStatus.PASSED, ranjit, sme, manager);
        addStep(tc14, 1, "Register claim for policy issued 18 months ago", "Claim created");
        addStep(tc14, 2, "System flags policy as in contestability period", "Contestability flag shown");
        addStep(tc14, 3, "Assign to investigation team", "Investigation initiated");
        addStep(tc14, 4, "Upload investigation findings", "Report attached to claim");
        addStep(tc14, 5, "If material misrepresentation found — repudiate", "Repudiation letter generated");
        save(tc14);

        TestCase tc15 = tc(seq++,"IPG-CLM-RDR-TC001",
            "Verify rider claim processing — Accidental Death Benefit rider",
            "Policy with ADB rider active; accidental death documented",
            pClaims, mRiderClaim, Priority.HIGH, TestStatus.FAILED, rohini, sme, manager);
        addStep(tc15, 1, "Register rider claim — ADB along with base death claim", "Both claims registered");
        addStep(tc15, 2, "Upload accident report, FIR, post-mortem report", "Documents accepted");
        addStep(tc15, 3, "Verify rider SA paid in addition to base SA", "Total payout = Base SA + ADB SA");
        addStep(tc15, 4, "Verify correct TDS deduction on total payout", "TDS certificate generated");
        save(tc15);

        // Commission
        TestCase tc16 = tc(seq++,"IPG-COMM-TC001",
            "Verify first year commission calculation for NB policy — traditional plan",
            "NB policy issued; agent code mapped; commission grid configured",
            pClaims, mCommission, Priority.HIGH, TestStatus.PASSED, nikhil, sme, manager);
        addStep(tc16, 1, "Issue NB policy via agent", "Policy issued; agent code in system");
        addStep(tc16, 2, "Navigate to Commission module for the policy", "Commission details page");
        addStep(tc16, 3, "Verify 1st year commission = Annual Premium × 35%", "Commission calculated correctly");
        addStep(tc16, 4, "Verify commission credited to agent account", "Agent statement updated");
        addStep(tc16, 5, "Verify TDS deducted if commission > threshold", "TDS applied as per IT Act");
        save(tc16);

        TestCase tc17 = tc(seq++,"IPG-COMM-TC012",
            "Verify commission clawback on policy lapse within 2 years",
            "Policy lapsed within 2 years; commission paid to agent",
            pClaims, mCommission, Priority.CRITICAL, TestStatus.DEFECT_RAISED, sandip, sme, manager);
        addStep(tc17, 1, "Identify lapsed policy within 2 years with commission paid", "Policy and commission records found");
        addStep(tc17, 2, "Trigger commission clawback process", "Clawback calculation initiated");
        addStep(tc17, 3, "Verify pro-rata clawback amount = Paid commission × remaining months / 24", "Formula applied correctly");
        addStep(tc17, 4, "Debit clawback from agent account", "Agent balance reduced");
        addStep(tc17, 5, "Generate clawback notice to agent", "Notice generated with calculation details");
        save(tc17);

        // GST
        TestCase tc18 = tc(seq++,"IPG-TAX-GST-TC001",
            "Verify GST calculation on first year premium — traditional life policy",
            "NB policy with annual premium 50000; GST configured at 4.5% for first year",
            pClaims, mGST, Priority.HIGH, TestStatus.PASSED, manmath, sme, manager);
        addStep(tc18, 1, "Create NB quotation with annual premium = 50000", "Quotation generated");
        addStep(tc18, 2, "Verify GST component = 50000 × 4.5% = 2250", "GST shown as line item");
        addStep(tc18, 3, "Verify total premium due = 52250", "Total matches sum of base + GST");
        addStep(tc18, 4, "Issue policy and check premium receipt for GST breakup", "Receipt shows GST separately");
        addStep(tc18, 5, "Verify GSTIN of insurer on the receipt", "GSTIN printed correctly");
        save(tc18);

        TestCase tc19 = tc(seq++,"IPG-PS-DISC-TC001",
            "Verify discontinuance value calculation after 2 complete policy years",
            "ULIP policy active for 2+ years; customer requests discontinuance",
            pPS, mDiscont, Priority.HIGH, TestStatus.PASSED, pranit, sme, manager);
        addStep(tc19, 1, "Navigate to discontinuance for ULIP policy (year 2+)", "Discontinuance form shown");
        addStep(tc19, 2, "System calculates discontinuance value after deducting charges", "DV = Fund Value - DC");
        addStep(tc19, 3, "Transfer amount to Discontinuance Policy Fund", "DPF balance updated");
        addStep(tc19, 4, "Lock-in period (5 years) applies — cannot withdraw yet", "Lock-in warning shown");
        addStep(tc19, 5, "Verify revival option available within lock-in period", "Revival button active");
        save(tc19);

        TestCase tc20 = tc(seq++,"IPG-PS-FREQ-TC001",
            "Verify frequency change from Annual to Monthly — mid-term",
            "Policy in active status; next renewal due in 30 days",
            pPS, mFreqChg, Priority.MEDIUM, TestStatus.PASSED, rutuja, sme, manager);
        addStep(tc20, 1, "Navigate to Frequency Change for active policy", "Frequency change form");
        addStep(tc20, 2, "Change from Annual to Monthly", "New premium calculated");
        addStep(tc20, 3, "Verify new monthly premium = Annual premium / 12 + loading", "Premium with loading shown");
        addStep(tc20, 4, "Confirm frequency change", "Change saved; next due updated");
        save(tc20);

        TestCase tc21 = tc(seq++,"IPG-PS-ADDR-TC001",
            "Verify address change via online portal — permanent address update",
            "Policyholder logged in; valid address proof available",
            pPS, mAddrChg, Priority.LOW, TestStatus.PASSED, yogesh, sme, manager);
        addStep(tc21, 1, "Login to customer portal and navigate to Profile", "Profile page shown");
        addStep(tc21, 2, "Click 'Change Address' and enter new permanent address", "Address form shown");
        addStep(tc21, 3, "Upload address proof (Aadhaar/Utility Bill)", "Document uploaded successfully");
        addStep(tc21, 4, "Submit request", "Request ID generated");
        addStep(tc21, 5, "Verify address updated in policy document", "New address reflected");
        save(tc21);

        TestCase tc22 = tc(seq++,"IPG-PS-NOM-TC001",
            "Verify nomination change — add new nominee with 100% share",
            "Policy active; policyholder is also the life assured",
            pPS, mNomChg, Priority.MEDIUM, TestStatus.PASSED, rameshwar, sme, manager);
        addStep(tc22, 1, "Navigate to Nomination Change", "Nomination form shown");
        addStep(tc22, 2, "Add new nominee: Name, DOB, Relationship, Share=100%", "Nominee details entered");
        addStep(tc22, 3, "Remove existing nominee if any", "Previous nominee removed");
        addStep(tc22, 4, "Submit and verify endorsement generated", "Endorsement document created");
        save(tc22);

        TestCase tc23 = tc(seq++,"IPG-PS-LDMS-TC001",
            "Verify LDMS — Loan against policy issuance within eligible surrender value",
            "Policy surrender value > 50000; no existing loan",
            pPS, mLDMS, Priority.HIGH, TestStatus.UNDER_REVIEW, ketan, sme, manager);
        addStep(tc23, 1, "Check policy eligibility for loan", "Loan eligibility = 85% of SV displayed");
        addStep(tc23, 2, "Enter loan amount (within eligible limit)", "Amount accepted");
        addStep(tc23, 3, "Calculate interest rate = 9% p.a.", "Interest schedule generated");
        addStep(tc23, 4, "Disburse loan to registered bank account", "Loan disbursed successfully");
        addStep(tc23, 5, "Verify policy lien marked for loan amount", "Lien reflected on policy");
        save(tc23);

        TestCase tc24 = tc(seq++,"IPG-PS-PART-TC001",
            "Verify partial withdrawal from ULIP after 5-year lock-in",
            "ULIP policy with 6+ years; lock-in period completed",
            pPS, mPartWith, Priority.HIGH, TestStatus.PASSED, ganesh, sme, manager);
        addStep(tc24, 1, "Navigate to Partial Withdrawal for ULIP post lock-in", "PW form available");
        addStep(tc24, 2, "Enter withdrawal amount (≤ 20% of fund value)", "Amount validated against limit");
        addStep(tc24, 3, "Verify minimum fund balance maintained post withdrawal", "Fund value check passed");
        addStep(tc24, 4, "Process withdrawal to registered bank account", "Amount credited");
        addStep(tc24, 5, "Verify free withdrawal count (2 free p.a.) or charge applied", "Charges applied if 3rd withdrawal");
        save(tc24);

        // ── Assignments ───────────────────────────────────────────────────────
        assign(tc1,  harshada,  manager, LocalDate.now().minusDays(30));
        assign(tc2,  harshada,  manager, LocalDate.now().minusDays(28));
        assign(tc3,  harshada,  manager, LocalDate.now().minusDays(25));
        assign(tc4,  nilesh,    manager, LocalDate.now().minusDays(20));
        assign(tc5,  nilesh,    manager, LocalDate.now().minusDays(18));
        assign(tc6,  rohini,    manager, LocalDate.now().minusDays(15));
        assign(tc7,  pallavi,   manager, LocalDate.now().minusDays(22));
        assign(tc8,  manmath,   manager, LocalDate.now().minusDays(10));
        assign(tc9,  ketan,     manager, LocalDate.now().minusDays(14));
        assign(tc10, ankita,    manager, LocalDate.now().minusDays(12));
        assign(tc11, ganesh,    manager, LocalDate.now().minusDays(8));
        assign(tc12, amit,      manager, LocalDate.now().plusDays(3));
        assign(tc13, manmath,   manager, LocalDate.now().minusDays(35));
        assign(tc14, ranjit,    manager, LocalDate.now().minusDays(28));
        assign(tc15, rohini,    manager, LocalDate.now().minusDays(10));
        assign(tc16, nikhil,    manager, LocalDate.now().minusDays(20));
        assign(tc17, sandip,    manager, LocalDate.now().minusDays(5));
        assign(tc18, manmath,   manager, LocalDate.now().minusDays(40));
        assign(tc19, pranit,    manager, LocalDate.now().minusDays(16));
        assign(tc20, rutuja,    manager, LocalDate.now().minusDays(9));
        assign(tc21, yogesh,    manager, LocalDate.now().minusDays(7));
        assign(tc22, rameshwar, manager, LocalDate.now().minusDays(6));
        assign(tc23, ketan,     manager, LocalDate.now().plusDays(5));
        assign(tc24, ganesh,    manager, LocalDate.now().minusDays(11));

        // ── Reviews ───────────────────────────────────────────────────────────
        rev(tc1,  sme, ReviewAction.APPROVED, "QC boundary cases well documented. Approved.");
        rev(tc2,  sme, ReviewAction.APPROVED, "Negative SA multiplier test — approved.");
        rev(tc3,  sme, ReviewAction.MODIFIED, "Added step to verify exact SA formula output. Under defect PDT-19882.");
        rev(tc4,  sme, ReviewAction.APPROVED, "Medical guidelines for 18-35 age bracket — approved.");
        rev(tc5,  sme, ReviewAction.APPROVED, "Medical waiver logic correct. Approved.");
        rev(tc6,  sme, ReviewAction.REJECTED, "Missing step to verify cotinine test name exactly per product spec.");
        rev(tc7,  sme, ReviewAction.APPROVED, "Digital journey E2E — comprehensive. Approved.");
        rev(tc9,  sme, ReviewAction.APPROVED, "Revival standard case complete. Approved.");
        rev(tc10, sme, ReviewAction.APPROVED, "Revival rejection negative test — approved.");
        rev(tc11, sme, ReviewAction.APPROVED, "Fund switch steps verified. Approved.");
        rev(tc13, sme, ReviewAction.APPROVED, "Death claim flow complete. Approved.");
        rev(tc14, sme, ReviewAction.APPROVED, "Contestability period handling correct.");
        rev(tc16, sme, ReviewAction.APPROVED, "Commission formula verified against product spec.");
        rev(tc17, sme, ReviewAction.MODIFIED, "Clawback formula needs % reference to product tariff. Modified.");
        rev(tc18, sme, ReviewAction.APPROVED, "GST calculation correct per current rate. Approved.");

        // ── Defects (real defect IDs from CSV) ───────────────────────────────
        defect("DEF-001", "PDT-19882",
            "SA Multiplier validation allows values above maximum in specific PT/PPT combinations",
            "For PT=22-23 and PPT=7, SA Multiplier 130 is accepted when maximum should be 125. " +
            "Affects IPG-NB-FUN-TC641, TC809, TC1055.",
            pNB, tc3, DefectSeverity.CRITICAL, DefectPriority.P1, DefectStatus.OPEN, harshada, nilesh);

        defect("DEF-002", "PDT-20056",
            "SA multiplier calculation incorrect for specific age/term combination",
            "For Age=23, PT=30-32, PPT=7 the system applies wrong multiplier table. " +
            "Expected: 120, Actual: 141.",
            pNB, tc3, DefectSeverity.HIGH, DefectPriority.P2, DefectStatus.IN_PROGRESS, harshada, manmath);

        defect("DEF-003", "Script fail — QC automation script failure on boundary cases",
            "Automation script fails for specific SA Multiplier boundary values. " +
            "Script exits with NullPointerException on premium calculation step.",
            "TC322, TC374 failing in automation suite. Manual execution passes.",
            pNB, tc1, DefectSeverity.HIGH, DefectPriority.P2, DefectStatus.OPEN, harshada, pallavi);

        defect("DEF-004", "PDT-COMM-001",
            "Commission clawback not triggered on lapse within 12 months",
            "Policies lapsed within first 12 months should trigger 100% commission clawback. " +
            "System currently only triggers partial clawback. Affects 23 policies.",
            pClaims, tc17, DefectSeverity.CRITICAL, DefectPriority.P1, DefectStatus.OPEN, sandip, nikhil);

        defect("DEF-005", "PDT-MED-045",
            "Smoker loading not applied when occupation is 'Hazardous'",
            "When applicant is both smoker and in hazardous occupation, " +
            "only occupation loading applied — smoker loading is skipped.",
            pNB, tc6, DefectSeverity.HIGH, DefectPriority.P1, DefectStatus.IN_PROGRESS, rohini, ketan);

        defect("DEF-006", "PDT-LDMS-007",
            "Loan eligibility shows 90% of surrender value instead of 85%",
            "LDMS module calculates loan eligibility as 90% of surrender value. " +
            "Product spec mandates maximum 85%.",
            pPS, tc23, DefectSeverity.HIGH, DefectPriority.P2, DefectStatus.FIXED, ketan, amit);

        defect("DEF-007", "PDT-DIGI-012",
            "IONE API integration — policy number not returned in response payload",
            "After successful policy issuance via IONE, the response JSON is missing " +
            "'policyNumber' field. Front-end shows blank policy number to customer.",
            pNB, tc8, DefectSeverity.CRITICAL, DefectPriority.P1, DefectStatus.RETEST, manmath, pallavi);

        defect("DEF-008", "PDT-SUR-003",
            "Surrender value calculation uses wrong GSV factor for year 4 traditional plan",
            "GSV factor for policy year 4 is configured as 50% instead of correct 30%. " +
            "Results in overpayment of surrender value.",
            pPS, tc12, DefectSeverity.CRITICAL, DefectPriority.P1, DefectStatus.OPEN, amit, ganesh);

        defect("DEF-009", "PDT-CLM-RDR-002",
            "ADB rider claim — post-mortem report not mandated in document checklist",
            "For accidental death, post-mortem report should be mandatory. " +
            "System currently allows claim submission without it.",
            pClaims, tc15, DefectSeverity.HIGH, DefectPriority.P2, DefectStatus.NEW, rohini, null);

        defect("DEF-010", "PDT-FREQ-008",
            "Monthly premium loading not applied when switching from annual to monthly frequency",
            "Expected: 3% frequency loading on monthly premium. " +
            "Actual: System applies annual premium / 12 without loading.",
            pPS, tc20, DefectSeverity.MEDIUM, DefectPriority.P3, DefectStatus.OPEN, rutuja, ganesh);

        // ── Sign-Off ──────────────────────────────────────────────────────────
        // NB - QC passed cases signed off
        List<TestCase> nbPassed = List.of(tc1, tc2, tc4, tc5, tc7, tc9, tc10, tc11);
        nbPassed.forEach(t -> { t.setStatus(TestStatus.SIGNED_OFF); testCaseRepository.save(t); });
        signOffRepository.save(SignOff.builder()
                .project(pNB).signedOffBy(sme)
                .passedCaseCount(nbPassed.size())
                .signedOffAt(Instant.now().minusSeconds(86400 * 3))
                .notes("QC eligibility, medical guidelines and digital journey core flows " +
                       "verified and signed off for UAT promotion.")
                .build());

        // Claims signed off
        List<TestCase> claimsPassed = List.of(tc13, tc14, tc16, tc18);
        claimsPassed.forEach(t -> { t.setStatus(TestStatus.SIGNED_OFF); testCaseRepository.save(t); });
        signOffRepository.save(SignOff.builder()
                .project(pClaims).signedOffBy(sme)
                .passedCaseCount(claimsPassed.size())
                .signedOffAt(Instant.now().minusSeconds(86400))
                .notes("Death claim, contestability, commission and GST test cases approved for release.")
                .build());

        log.info("✅  IPG data seeded: 3 projects, {} modules, {} test cases, {} defects, 2 sign-offs",
                moduleRepository.count(), testCaseRepository.count(), defectRepository.count());

        // ── Execution Records ────────────────────────────────────────────────
        seedExecutions(pNB, pPS, pClaims,
                harshada, pallavi, manmath, nilesh, rohini, ketan,
                ankita, ganesh, amit, ranjit, nikhil, sandip, pranit, rutuja,
                tc1, tc2, tc3, tc4, tc5, tc6, tc7, tc8, tc9, tc10,
                tc11, tc12, tc13, tc14, tc15, tc16, tc17, tc18, tc19, tc20,
                tc21, tc22, tc23, tc24);

        log.info("✅  Execution records seeded: {} total", executionRepository.count());
    }

    private void seedExecutions(Project pNB, Project pPS, Project pClaims,
            User harshada, User pallavi, User manmath, User nilesh, User rohini,
            User ketan, User ankita, User ganesh, User amit, User ranjit,
            User nikhil, User sandip, User pranit, User rutuja,
            TestCase tc1, TestCase tc2, TestCase tc3, TestCase tc4, TestCase tc5,
            TestCase tc6, TestCase tc7, TestCase tc8, TestCase tc9, TestCase tc10,
            TestCase tc11, TestCase tc12, TestCase tc13, TestCase tc14, TestCase tc15,
            TestCase tc16, TestCase tc17, TestCase tc18, TestCase tc19, TestCase tc20,
            TestCase tc21, TestCase tc22, TestCase tc23, TestCase tc24) {

        // ── Run 1 executions (initial test runs) ─────────────────────────────
        exec(tc1,  harshada, ExecResult.PASSED,        "Logged in successfully. Redirected to dashboard.",
             ExecutionEnvironment.PREPROD, "R2024.11.1", 1, daysAgo(30), null, null);

        exec(tc2,  harshada, ExecResult.PASSED,        "Error shown correctly for wrong password.",
             ExecutionEnvironment.PREPROD, "R2024.11.1", 1, daysAgo(30), null, null);

        exec(tc3,  harshada, ExecResult.FAILED,
             "SA Multiplier 130 accepted without error for PT=22, PPT=7. Should have been rejected.",
             ExecutionEnvironment.PREPROD, "R2024.11.1", 1, daysAgo(25), "PDT-19882",
             "System accepted SA multiplier 130 which exceeds maximum of 125.");

        // Re-run of tc3 after dev fix
        exec(tc3,  harshada, ExecResult.DEFECT_RAISED,
             "Fix applied but new defect observed — validation shows wrong error message.",
             ExecutionEnvironment.PREPROD, "R2024.11.2", 2, daysAgo(18), "PDT-20056",
             "Error message says 'Invalid field' instead of 'SA Multiplier exceeds maximum limit'.");

        exec(tc4,  nilesh, ExecResult.PASSED,
             "Medical requirements correctly listed for 18-35 age group with SA > 25L.",
             ExecutionEnvironment.PREPROD, "R2024.11.1", 1, daysAgo(20), null, null);

        exec(tc5,  nilesh, ExecResult.PASSED,
             "No medical requirement shown for SA ≤ 10L, age < 45. Correct.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(18), null, null);

        exec(tc6,  rohini, ExecResult.FAILED,
             "Smoker loading not applied when occupation is Hazardous.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(15), "PDT-MED-045",
             "Occupation loading applied but smoker loading skipped. Both should apply.");

        exec(tc7,  pallavi, ExecResult.PASSED,
             "Digital journey completed successfully. Policy number generated in correct format.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(22), null, null);

        exec(tc8,  manmath, ExecResult.DEFECT_RAISED,
             "IONE API response missing policyNumber field after successful issuance.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(10), "PDT-DIGI-012",
             "Response JSON: { status: 'SUCCESS', policyNumber: null } — field is null.");

        exec(tc9,  ketan, ExecResult.PASSED,
             "Revival completed. Policy status changed to Active. Premium arrears + interest calculated correctly.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(14), null, null);

        exec(tc10, ankita, ExecResult.PASSED,
             "Revival correctly rejected for policy lapsed > 2 years.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(12), null, null);

        exec(tc11, ganesh, ExecResult.PASSED,
             "Fund switch from equity to debt successful. Units redeemed and reallocated correctly.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(8), null, null);

        exec(tc12, amit, ExecResult.BLOCKED,
             "Surrender module not deployed in current build. Cannot execute.",
             ExecutionEnvironment.SIT, "R2024.11.2", 1, daysAgo(5), null,
             "Blocked — awaiting deployment of PS surrender module in SIT environment.");

        exec(tc13, manmath, ExecResult.PASSED,
             "Death claim processed end to end. SA + bonus paid to nominee correctly.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(35), null, null);

        exec(tc14, ranjit, ExecResult.PASSED,
             "Contestability flag raised. Investigation assigned. Repudiation letter generated.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(28), null, null);

        exec(tc15, rohini, ExecResult.FAILED,
             "ADB rider claim submitted without post-mortem report — no validation error shown.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(10), "PDT-CLM-RDR-002",
             "System accepted claim submission without mandatory post-mortem report.");

        exec(tc16, nikhil, ExecResult.PASSED,
             "1st year commission = 35% of annual premium. Commission credited to agent account.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(20), null, null);

        exec(tc17, sandip, ExecResult.DEFECT_RAISED,
             "Commission clawback not triggered for policy lapsed in month 10.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(5), "PDT-COMM-001",
             "Clawback should be 100% for lapse within 12 months. System did not trigger clawback.");

        exec(tc18, manmath, ExecResult.PASSED,
             "GST = 4.5% of 50000 = 2250 correctly shown. Total = 52250. GSTIN on receipt correct.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(40), null, null);

        exec(tc19, pranit, ExecResult.PASSED,
             "Discontinuance value calculated after deducting charges. Amount in DPF. Lock-in warning shown.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(16), null, null);

        exec(tc20, rutuja, ExecResult.FAILED,
             "Monthly loading not applied. System divides annual/12 without 3% loading.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(9), "PDT-FREQ-008",
             "Monthly premium = 4167 (50000/12). Expected = 4292 (50000/12 × 1.03).");

        exec(tc21, ganesh, ExecResult.PASSED,
             "Address updated successfully. Document accepted. New address on policy confirmed.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(7), null, null);

        exec(tc22, nikhil, ExecResult.PASSED,
             "Nomination change saved. Old nominee removed. Endorsement generated.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(6), null, null);

        exec(tc23, ketan, ExecResult.FAILED,
             "Loan eligibility shows 90% of surrender value. Expected 85%.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(12), "PDT-LDMS-007",
             "Policy SV = 200000. Eligible loan shown as 180000 (90%). Should be 170000 (85%).");

        exec(tc24, ganesh, ExecResult.PASSED,
             "Partial withdrawal processed. Free withdrawal count checked. Amount credited.",
             ExecutionEnvironment.SIT, "R2024.11.1", 1, daysAgo(11), null, null);

        // ── UAT Re-runs after fix deployments ────────────────────────────────
        exec(tc1,  harshada, ExecResult.PASSED,
             "UAT — Login flow verified on production-like env. No issues.",
             ExecutionEnvironment.UAT_2, "R2024.12.0", 2, daysAgo(10), null, null);

        exec(tc4,  nilesh, ExecResult.PASSED,
             "UAT — Medical guidelines re-verified after config update.",
             ExecutionEnvironment.UAT_2 , "R2024.12.0", 2, daysAgo(8), null, null);

        exec(tc9,  ketan, ExecResult.PASSED,
             "UAT — Revival smoke test passed.",
             ExecutionEnvironment.UAT_2, "R2024.12.0", 2, daysAgo(7), null, null);

        exec(tc13, manmath, ExecResult.PASSED,
             "UAT — Death claim E2E re-verified. All good.",
             ExecutionEnvironment.UAT_2, "R2024.12.0", 2, daysAgo(6), null, null);

        // Fix re-test for tc23 (LDMS loan eligibility)
        exec(tc23, ketan, ExecResult.PASSED,
             "Defect PDT-LDMS-007 fixed. Loan eligibility now shows 85% correctly.",
             ExecutionEnvironment.SIT, "R2024.11.3", 2, daysAgo(3), null, null);

        // Additional tester productivity data points
        exec(tc7,  pallavi, ExecResult.PASSED,
             "Regression — digital journey re-run after UI changes.",
             ExecutionEnvironment.SIT, "R2024.11.2", 2, daysAgo(5), null, null);

        exec(tc16, nikhil, ExecResult.PASSED,
             "Regression — commission verification after tariff update.",
             ExecutionEnvironment.SIT, "R2024.11.2", 2, daysAgo(4), null, null);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User tester(String username, String email, String fullName) {
        return userRepository.findByEmail(email).orElseGet(() ->
            userRepository.save(User.builder()
                .username(username).email(email)
                .passwordHash(passwordEncoder.encode("Tester@1234"))
                .fullName(fullName).role(UserRole.TESTER).team("QA").active(true)
                .build()));
    }

    private Project saveProject(String name, String desc, User owner, Project parent) {
        return projectRepository.save(Project.builder()
                .name(name).description(desc).owner(owner)
                .parentProject(parent).active(true).build());
    }

    private Module mod(String name, Project project) {
        return moduleRepository.save(Module.builder().name(name).project(project).build());
    }

    private Module subMod(String name, Project project, Module parent) {
        return moduleRepository.save(Module.builder()
                .name(name).project(project).parentModule(parent).build());
    }

    private TestCase tc(int seq, String code, String title, String preconditions,
                        Project project, Module module, Priority priority, TestStatus status,
                        User createdBy, User reviewedBy, User assignedTo) {
        return testCaseRepository.save(TestCase.builder()
                .code(code != null ? code : String.format("TC-%03d", seq))
                .title(title).description(title).preconditions(preconditions)
                .project(project).module(module).priority(priority).status(status)
                .createdBy(createdBy).reviewedBy(reviewedBy).assignedTo(assignedTo)
                .build());
    }

    private void addStep(TestCase tc, int num, String action, String expected) {
        TestStep s = TestStep.builder().testCase(tc).stepNumber(num)
                .stepAction(action).expectedResult(expected).build();
        tc.getSteps().add(s);
    }

    private void save(TestCase tc) { testCaseRepository.save(tc); }

    private void assign(TestCase tc, User tester, User manager, LocalDate due) {
        assignmentRepository.save(TestCaseAssignment.builder()
                .testCase(tc).assignedTo(tester).assignedBy(manager)
                .assignedAt(Instant.now().minusSeconds(86400 * 5)).dueDate(due).build());
    }

    private void rev(TestCase tc, User reviewer, ReviewAction action, String comment) {
        reviewRepository.save(TestCaseReview.builder()
                .testCase(tc).reviewedBy(reviewer).action(action).comment(comment)
                .reviewedAt(Instant.now().minusSeconds((long)(Math.random() * 86400 * 5))).build());
    }

    private void defect(String code, String title, String description,
                        String additionalInfo, Project project, TestCase tc,
                        DefectSeverity severity, DefectPriority priority, DefectStatus status,
                        User reportedBy, User assignedTo) {
        defectRepository.save(Defect.builder()
                .code(code).title(title)
                .description(description + (additionalInfo != null ? " | " + additionalInfo : ""))
                .project(project).testCase(tc).severity(severity).priority(priority)
                .status(status).reportedBy(reportedBy).assignedTo(assignedTo).build());
    }

    private void exec(TestCase tc, User tester, ExecResult result, String actualResult,
                      ExecutionEnvironment env, String build, int runNumber,
                      Instant executedAt, String defectRef, String notes) {

        // Use the efficient JPQL bulk-update instead of findAll()
        executionRepository.markAllNotLatest(tc);

        executionRepository.save(TestExecution.builder()
                .testCase(tc)
                .project(tc.getProject())
                .executedBy(tester)
                .result(result)
                .environment(env)
                .buildVersion(build)
                .runNumber(runNumber)
                .actualResult(actualResult)
                .notes(notes)
                .defectRef(defectRef)
                .executedAt(executedAt)
                .isLatest(true)
                .build());

        // Update TC status to match latest execution result
        tc.setStatus(mapExecToStatus(result));
        testCaseRepository.save(tc);
    }

    private TestStatus mapExecToStatus(ExecResult result) {
        return switch (result) {
            case PASSED        -> TestStatus.PASSED;
            case FAILED        -> TestStatus.FAILED;
            case DEFECT_RAISED -> TestStatus.DEFECT_RAISED;
            case BLOCKED       -> TestStatus.FAILED;
            case SKIPPED       -> TestStatus.ASSIGNED;
            case IN_PROGRESS   -> TestStatus.IN_PROGRESS;
            case RETEST        -> TestStatus.IN_PROGRESS;
        };
    }

    private Instant daysAgo(int days) {
        return Instant.now().minusSeconds(86400L * days);
    }
}
