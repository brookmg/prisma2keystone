 // Like the "config" function we use in keystone.ts, we use functions
// for putting in our config so we get useful errors. With typescript,
// we get these even before code runs.
import { config, list } from '@keystone-6/core';        
        

 // We're using some common fields in the starter. Check out https://keystonejs.com/docs/apis/fields#fields-api
// for the full list of fields.

import {
    // Scalar types
    checkbox,
    integer,
    json,
    float,
    password,
    select,
    text,
    timestamp,

    // Relationship type
    relationship,

    // Virtual type
    virtual,

    // File types
    file,
    image,
} from '@keystone-6/core/fields';
        

 // The document field is a more complicated field, so it's in its own package
// Keystone aims to have all the base field types, but you can make your own
// custom ones.
import { document } from '@keystone-6/fields-document';
        

 // We are using Typescript, and we want our types experience to be as strict as it can be.
// By providing the Keystone generated `Lists` type to our lists object, we refine
// our types to a stricter subset that is type-aware of other lists in our schema
// that Typescript cannot easily infer.
import { Lists } from '.keystone/types';

export const lists: Lists = {
    Profile: list({
            fields: {
                firstName: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: true
                    },
                    validation: {
                        isRequired: false
                    }
                }),
                lastName: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: true
                    },
                    validation: {
                        isRequired: false
                    }
                }),
                companyName: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: true
                    },
                    validation: {
                        isRequired: false
                    }
                }),
                phoneNumber: text({
                    isFilterable: true,
                    isOrderable: true,
                    isIndexed: "unique",
                    db: {
                        isNullable: true
                    },
                    validation: {
                        isRequired: false
                    }
                }),
                email: text({
                    isFilterable: true,
                    isOrderable: true,
                    isIndexed: "unique",
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                verifiedPhoneNumber: checkbox({
                    defaultValue: false,
                    db: {}
                }),
                verifiedProfile: checkbox({
                    defaultValue: false,
                    db: {}
                }),
                verifiedEmail: checkbox({
                    defaultValue: false,
                    db: {}
                }),
                password: password({
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true,
                        rejectCommon: true
                    }
                }),
                role: select({
                    type: "enum",
                    options: [
                        {
                            label: "User",
                            value: "USER"
                        },
                        {
                            label: "Admin",
                            value: "ADMIN"
                        },
                        {
                            label: "Support",
                            value: "SUPPORT"
                        }
                    ],
                    defaultValue: "USER",
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                deleted: checkbox({
                    defaultValue: false,
                    db: {}
                }),
                attempts: integer({
                    defaultValue: 0,
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                createdAt: timestamp({
                    defaultValue: { kind: "now" },
                    db: {
                        isNullable: false,
                        updatedAt: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                updatedAt: timestamp({
                    defaultValue: { kind: "now" },
                    db: {
                        isNullable: false,
                        updatedAt: true
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                logs: relationship({
                    ref: "Log",
                    many: true,
                    db: {
                        relationName: "LogToProfile"
                    }
                })
            }
        }),
    Log: list({
            fields: {
                ip: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                profileId: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: true
                    },
                    validation: {
                        isRequired: false
                    }
                }),
                method: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                route: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                tag: select({
                    type: "enum",
                    options: [
                        {
                            label: "Error",
                            value: "ERROR"
                        },
                        {
                            label: "Info",
                            value: "INFO"
                        }
                    ],
                    defaultValue: "INFO",
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                statusCode: integer({
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                useragent: text({
                    isFilterable: true,
                    isOrderable: true,
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                responseTime: float({
                    db: {
                        isNullable: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                createdAt: timestamp({
                    defaultValue: { kind: "now" },
                    db: {
                        isNullable: false,
                        updatedAt: false
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                updatedAt: timestamp({
                    defaultValue: { kind: "now" },
                    db: {
                        isNullable: false,
                        updatedAt: true
                    },
                    validation: {
                        isRequired: true
                    }
                }),
                blame: relationship({
                    ref: "Profile",
                    many: false,
                    db: {}
                })
            }
        })
};

enum EventTag {
    ERROR,
    INFO
}

enum Role {
    USER,
    ADMIN,
    SUPPORT
}
