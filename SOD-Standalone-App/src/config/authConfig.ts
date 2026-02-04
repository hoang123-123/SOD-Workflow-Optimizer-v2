import { Configuration, LogLevel } from '@azure/msal-browser';

// ============================================
// CẤU HÌNH AZURE AD / MSAL - HARDCODED
// ============================================
// ⚠️ LƯU Ý: Bạn cần điền Client ID và Tenant ID từ Azure AD App Registration
// 
// HƯỚNG DẪN TẠO APP REGISTRATION:
// 1. Vào Azure Portal -> Microsoft Entra ID -> App registrations -> New registration
// 2. Name: "SOD Standalone App"
// 3. Redirect URI: Single-page application -> http://localhost:3000
// 4. API permissions -> Add -> Dynamics CRM -> user_impersonation -> Grant admin consent

// ================================
// ⚠️ ĐIỀN THÔNG TIN CỦA BẠN TẠI ĐÂY
// ================================
const AZURE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';  // TODO: Thay bằng Application (client) ID
const AZURE_TENANT_ID = 'YOUR_TENANT_ID_HERE';  // TODO: Thay bằng Directory (tenant) ID
const DATAVERSE_ORG_URL = 'https://wecare-ii.api.crm5.dynamics.com';  // ✅ Đã có
const REDIRECT_URI = 'http://localhost:3000';

export const msalConfig: Configuration = {
    auth: {
        clientId: AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
        redirectUri: REDIRECT_URI,
        postLogoutRedirectUri: '/',
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            },
        },
    },
};

// Scope để truy cập Dataverse API
export const loginRequest = {
    scopes: [`${DATAVERSE_ORG_URL}/.default`],
};

// Dataverse config
export const DATAVERSE_CONFIG = {
    ORG_URL: DATAVERSE_ORG_URL,
};

// Status map (giống project gốc)
export const DATAVERSE_STATUS_MAP = {
    DELIVERED: 191920002,
};
