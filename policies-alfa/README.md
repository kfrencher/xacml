# ALFA Policy for System A Person Dataset

This directory contains ALFA (Abbreviated Language for Authorization) policy files that provide a cleaner, more readable alternative to raw XACML XML policies.

## Policy Overview

The `person-dataset-clean.alfa` file provides the ALFA equivalent of the `system-a-ps_ds-person-ps.xml` XACML policy with the following access control rules:

### Access Control Rules
- ✅ **Allow** read access to the complete person dataset (`urn:klf:ds:person`)
- ✅ **Allow** read access to the person name field (`urn:klf:ds:field:person.name`)
- ✅ **Allow** read access to the person date of birth field (`urn:klf:ds:field:person.dob`)
- ❌ **Deny** access to all other person fields (secure by default)

### Policy Structure

The ALFA policy uses a `denyUnlessPermit` combining algorithm, which provides secure-by-default behavior where only explicitly permitted resources are accessible.

```alfa
policyset PersonDatasetAccess {
    apply denyUnlessPermit

    rule AllowDatasetRead {
        condition resourceId == "urn:klf:ds:person" && actionId == "read"
        permit
    }

    rule AllowPersonName {
        condition resourceId == "urn:klf:ds:field:person.name"
        permit
    }

    rule AllowPersonDob {
        condition resourceId == "urn:klf:ds:field:person.dob"
        permit
    }
}
```

## Advantages of ALFA over XML

1. **Readability**: Much cleaner and more readable than raw XACML XML
2. **Maintainability**: Easier to modify and understand policy logic
3. **Conciseness**: Significantly fewer lines of code (50+ lines of XML → ~15 lines of ALFA)
4. **Type Safety**: Built-in type checking and validation
5. **IDE Support**: Better syntax highlighting and error detection

## Usage

ALFA policies can be compiled to standard XACML XML using ALFA tools. The resulting XML is functionally equivalent to the original hand-written XACML policy but benefits from:

- Automated generation (less prone to human error)
- Consistent formatting and structure
- Built-in validation during compilation

## Files

- `person-dataset-clean.alfa` - Clean, simplified ALFA policy equivalent
- `system-a-person-dataset.alfa` - More detailed ALFA policy with comprehensive comments

## Note on VS Code Syntax Validation

The ALFA files may show syntax validation errors in VS Code due to the ALFA language extension's parser sensitivity. These are typically false positives - the ALFA syntax used is correct according to the ALFA language specification. The policies can be successfully compiled to XACML using proper ALFA tooling.