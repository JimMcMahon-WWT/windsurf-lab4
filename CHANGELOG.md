# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-10-16

### Added
- Phone number validation utilities (validatePhone and validateUSPhone)
- Support for international E.164 phone format
- Support for US-specific phone format validation

### Changed
- Enhanced user service with additional validators

### Fixed
- Login timeout increased to 30 seconds (from v1.0.1 hotfix)

---

## [1.0.1] - 2025-10-15

### Fixed
- Increased login timeout from 10s to 30s to accommodate slower connections
- Affects approximately 5% of users experiencing timeout errors

---

## [1.0.0] - 2025-10-15

### Added
- Initial production release
- User service with email validation
- Basic microservices structure
- Git workflow documentation
- Branch protection rules
- CI/CD pipeline configuration
