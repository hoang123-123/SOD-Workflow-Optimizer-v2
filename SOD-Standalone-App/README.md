# SOD Standalone App

Đây là phiên bản **standalone** của SOD Workflow Optimizer, chạy độc lập bên ngoài Dynamics 365. App sử dụng **MSAL (Microsoft Authentication Library)** để xác thực trực tiếp với Azure AD và gọi Dataverse API.

## 🚀 Tính năng

- ✅ Đăng nhập bằng tài khoản Microsoft (Azure AD)
- ✅ Xem danh sách khách hàng
- ✅ Xem đơn hàng theo khách hàng
- ✅ Xem chi tiết SOD với thông tin sản phẩm
- ✅ Form báo cáo kiểm đếm thực tế (Warehouse role)
- ✅ Chuyển đổi vai trò (Sale / Source / Warehouse)

## 📋 Yêu cầu cấu hình Azure AD

### Bước 1: Tạo App Registration

1. Đăng nhập [Azure Portal](https://portal.azure.com)
2. Vào **Microsoft Entra ID** (trước đây là Azure AD)
3. Chọn **App registrations** → **New registration**
4. Điền thông tin:
   - **Name**: `SOD Standalone App`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: `Single-page application (SPA)` → `http://localhost:3000`

### Bước 2: Cấu hình API Permissions

1. Trong App Registration, chọn **API permissions**
2. Click **Add a permission** → **APIs my organization uses**
3. Tìm "Dynamics CRM" hoặc "Common Data Service"
4. Chọn **Delegated permissions** → `user_impersonation`
5. Click **Grant admin consent for [Organization]**

### Bước 3: Lấy thông tin cấu hình

1. **Client ID**: Trong **Overview** → `Application (client) ID`
2. **Tenant ID**: Trong **Overview** → `Directory (tenant) ID`
3. **Dataverse URL**: URL tổ chức của bạn (VD: `https://yourorg.crm.dynamics.com`)

## ⚙️ Cài đặt

```bash
# 1. Di chuyển vào thư mục project
cd SOD-Standalone-App

# 2. Cài đặt dependencies
npm install

# 3. Copy file .env.example thành .env
copy .env.example .env

# 4. Chỉnh sửa file .env với thông tin Azure AD của bạn
# VITE_AZURE_CLIENT_ID=your-client-id
# VITE_AZURE_TENANT_ID=your-tenant-id
# VITE_DATAVERSE_ORG_URL=https://yourorg.crm.dynamics.com
# VITE_REDIRECT_URI=http://localhost:3000

# 5. Chạy development server
npm run dev
```

## 🔧 Environment Variables

| Variable | Mô tả | Ví dụ |
|----------|-------|-------|
| `VITE_AZURE_CLIENT_ID` | Client ID từ Azure App Registration | `12345678-abcd-1234-...` |
| `VITE_AZURE_TENANT_ID` | Tenant ID của tổ chức | `87654321-dcba-4321-...` |
| `VITE_DATAVERSE_ORG_URL` | URL tổ chức Dataverse | `https://myorg.crm.dynamics.com` |
| `VITE_REDIRECT_URI` | URL redirect sau đăng nhập | `http://localhost:3000` |

## 🏗️ Cấu trúc thư mục

```
SOD-Standalone-App/
├── src/
│   ├── config/
│   │   └── authConfig.ts     # Cấu hình MSAL/Azure AD
│   ├── services/
│   │   └── dataverse.ts      # Service gọi Dataverse API
│   ├── styles/
│   │   └── index.css         # CSS styles
│   ├── App.tsx               # Main App component
│   ├── main.tsx              # Entry point
│   ├── types.ts              # TypeScript interfaces
│   └── vite-env.d.ts         # Vite env types
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## 📝 So sánh với app gốc

| Tính năng | App gốc (Web Resource) | App Standalone |
|-----------|------------------------|----------------|
| Xác thực | Power Automate Flow | MSAL (Azure AD) |
| Deploy | Trong Dynamics 365 | Bất kỳ hosting nào |
| CORS | Không cần | Cần đăng ký redirect URI |
| Quyền truy cập | Theo User Dynamics | Theo Azure AD App |

## 🚀 Build cho Production

```bash
npm run build
```

Output sẽ được tạo trong thư mục `dist/`. Bạn có thể deploy lên bất kỳ static hosting nào (Netlify, Vercel, Azure Static Web Apps, etc.)

**Lưu ý:** Cần cập nhật `VITE_REDIRECT_URI` trong Azure App Registration để khớp với domain production.
