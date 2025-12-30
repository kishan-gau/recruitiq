/**
 * Common k6 Load Test Configuration
 * Industry-standard thresholds and settings
 */
export const BASE_URL: any;
export const HEADERS: {
    'Content-Type': string;
    Accept: string;
};
export namespace THRESHOLDS {
    let http_req_duration: string[];
    let http_req_failed: string[];
    let http_reqs: string[];
}
export namespace STRICT_THRESHOLDS {
    let http_req_duration_1: string[];
    export { http_req_duration_1 as http_req_duration };
    let http_req_failed_1: string[];
    export { http_req_failed_1 as http_req_failed };
    let http_reqs_1: string[];
    export { http_reqs_1 as http_reqs };
}
export namespace TEST_USER {
    let email: string;
    let password: string;
    let name: string;
}
export namespace TEST_CANDIDATE {
    let name_1: string;
    export { name_1 as name };
    let email_1: string;
    export { email_1 as email };
    export let phone: string;
    export let source: string;
}
export namespace TEST_JOB {
    let title: string;
    let department: string;
    let location: string;
    let employmentType: string;
    let description: string;
}
export namespace SLEEP {
    let SHORT: number;
    let MEDIUM: number;
    let LONG: number;
    let THINK: number;
}
export namespace VU_CONFIG {
    namespace smoke {
        let vus: number;
        let duration: string;
    }
    namespace load {
        let vus_1: number;
        export { vus_1 as vus };
        let duration_1: string;
        export { duration_1 as duration };
    }
    namespace stress {
        let stages: {
            duration: string;
            target: number;
        }[];
    }
    namespace spike {
        let stages_1: {
            duration: string;
            target: number;
        }[];
        export { stages_1 as stages };
    }
    namespace soak {
        let stages_2: {
            duration: string;
            target: number;
        }[];
        export { stages_2 as stages };
    }
}
export namespace CHECKS {
    let status200: {
        'status is 200': (r: any) => boolean;
    };
    let status201: {
        'status is 201': (r: any) => boolean;
    };
    let statusSuccess: {
        'status is 2xx': (r: any) => boolean;
    };
    let hasData: {
        'has response data': (r: any) => boolean;
    };
    let jsonResponse: {
        'is JSON': (r: any) => boolean;
    };
}
export namespace TAGS {
    namespace auth {
        let name_2: string;
        export { name_2 as name };
    }
    namespace jobs {
        let name_3: string;
        export { name_3 as name };
    }
    namespace candidates {
        let name_4: string;
        export { name_4 as name };
    }
    namespace users {
        let name_5: string;
        export { name_5 as name };
    }
    namespace workspaces {
        let name_6: string;
        export { name_6 as name };
    }
}
//# sourceMappingURL=common.d.ts.map