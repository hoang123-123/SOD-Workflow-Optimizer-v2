
// Cấu hình kết nối Dataverse
// Lưu ý: Bạn cần thay đổi ORG_URL thành URL thực tế của môi trường Dataverse của bạn
// Ví dụ: https://org12345.crm.dynamics.com
export const DATAVERSE_CONFIG = {
  ORG_URL: import.meta.env.VITE_DATAVERSE_ORG_URL || '',
  AUTH_TRIGGER_URL: import.meta.env.VITE_AUTH_TRIGGER_URL || ''
};

// Mapping các giá trị Status Code của Dataverse sang Enum nội bộ (Giả định)
export const DATAVERSE_STATUS_MAP = {
  DELIVERED: 191920002
};
