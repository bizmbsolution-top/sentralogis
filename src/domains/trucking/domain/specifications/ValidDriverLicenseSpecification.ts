
export class ValidDriverLicenseSpecification {
  isSatisfiedBy(driverLicenseExpiry: Date): boolean {
    return driverLicenseExpiry > new Date();
  }
}
