package com.testmgmt.config;

import com.testmgmt.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration @EnableWebSecurity @EnableMethodSecurity @RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()

                // SME only
                .requestMatchers("/api/v1/testcases/sme-queue").hasAnyRole("SME","MANAGER","ADMIN")
                .requestMatchers("/api/v1/testcases/bulk-approve").hasAnyRole("SME","MANAGER","ADMIN")
                .requestMatchers("/api/v1/testcases/signoff/**").hasAnyRole("SME","MANAGER","ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/v1/testcases/*/sme-review").hasRole("SME")
                .requestMatchers(HttpMethod.POST, "/api/v1/testcases/*/request-changes").hasRole("SME")

                // Manager/Admin only
                .requestMatchers("/api/v1/testcases/assign").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/v1/testcases/assign-by-module").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/testcases/*/forward-sme").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/testcases/*/reassign").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/testcases/*/send-uat").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/testcases/*/send-redevelopment").hasAnyRole("MANAGER","ADMIN","SME")
                .requestMatchers(HttpMethod.POST,  "/api/v1/testcases/*/clone").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/v1/reports/**").hasAnyRole("MANAGER","ADMIN","TESTER","SME")
                .requestMatchers("/api/v1/requirements").hasAnyRole("MANAGER","ADMIN","SME","TESTER","VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/v1/requirements").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/v1/requirements/testcases/**").hasAnyRole("MANAGER","ADMIN")

                // Tags
                .requestMatchers(HttpMethod.GET, "/api/v1/tags").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/tags").hasAnyRole("MANAGER","ADMIN","TESTER")
                .requestMatchers("/api/v1/testcases/*/tags/**").hasAnyRole("MANAGER","ADMIN","TESTER")

                // Notifications — any auth user
                .requestMatchers("/api/v1/notifications/**").authenticated()

                // Attachments — auth users
                .requestMatchers("/api/v1/attachments/**").authenticated()
                .requestMatchers("/api/v1/executions/*/attachments").authenticated()
                .requestMatchers("/api/v1/defects/*/attachments").authenticated()

                // Version history
                .requestMatchers("/api/v1/testcases/*/versions/**").authenticated()

                // Search
                .requestMatchers("/api/v1/search").authenticated()

                // Import
                .requestMatchers(HttpMethod.POST, "/api/v1/testcases/import").hasAnyRole("TESTER","MANAGER","ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/v1/testcases/import/template").authenticated()
                .requestMatchers(HttpMethod.GET,  "/api/v1/testcases/export").authenticated()

                // Productivity
                .requestMatchers("/api/v1/productivity/me").hasAnyRole("TESTER","MANAGER","ADMIN")
                .requestMatchers("/api/v1/productivity/**").hasAnyRole("MANAGER","ADMIN")

                // Execution
                .requestMatchers(HttpMethod.GET, "/api/v1/executions/summary").hasAnyRole("MANAGER","ADMIN","SME","TESTER")
                .requestMatchers("/api/v1/executions/**").authenticated()

                // User management
                .requestMatchers(HttpMethod.POST,  "/api/v1/users").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/v1/users/me").authenticated()
                .requestMatchers(HttpMethod.GET,   "/api/v1/users/testers").authenticated()
                .requestMatchers(HttpMethod.GET,   "/api/v1/users/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers(HttpMethod.PUT,   "/api/v1/users/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/users/**").hasAnyRole("MANAGER","ADMIN")

                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(userDetailsService);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }
    @Bean public AuthenticationManager authenticationManager(AuthenticationConfiguration c) throws Exception { return c.getAuthenticationManager(); }
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
