// Service Request table Version 1.2 - Debug Mode

const REQUEST_TYPE_CHOT_GIAO_SOD = 191920004;
const CUSTOMER_FIELD_NAME = "crdfd_khach_hang"; // <-- CẦN XÁC ĐỊNH CHÍNH XÁC TÊN TRƯỜNG NÀY
const REQUEST_TYPE_FIELD_NAME = "crdfd_loai_yeu_cau";
const EMPLOYEE_LOGICAL_NAME = "systemuser";
const REQUEST_LOGICAL_NAME = "crdfd_order_request";
function canOpenSODDialog(context) {
    if (!context) {
        return false;
    }

    let formContext =
        typeof context.getFormContext === "function"
            ? context.getFormContext()
            : context;

    // 1. Kiểm tra Form Type
    const formType = formContext.ui.getFormType();

    if (formType === 1) {
        return false;
    }

    // 2. Kiểm tra Record ID
    const recordId = formContext.data.entity.getId();

    if (!recordId) {
        return false;
    }

    // 3. Kiểm tra Khách hàng
    const customerInfo = getCustomerInfo(formContext);

    if (!customerInfo) {
        return false;
    }

    // 4. Kiểm tra Loại yêu cầu
    const requestTypeAttr = formContext.getAttribute(REQUEST_TYPE_FIELD_NAME);
    const requestTypeValue = requestTypeAttr ? requestTypeAttr.getValue() : null;

    if (requestTypeValue !== REQUEST_TYPE_CHOT_GIAO_SOD) {
        return false;
    }

    return true;
}

async function openSODDialog(context) {
    let formContext =
        typeof context.getFormContext === "function"
            ? context.getFormContext()
            : context;

    if (!formContext || !formContext.data || !formContext.data.entity) {
        return;
    }

    // Record ID
    const recordId = formContext.data.entity.getId()?.replace(/[{}]/g, "");
    if (!recordId) {
        return;
    }

    // Customer
    const customer = await getCustomerInfo(formContext);
    if (!customer || !customer.id) {
        return;
    }
    console.log("[SOD Debug] Customer:", customer);

    // ===== HISTORY =====
    // [REMOVED] Không cần đọc và truyền historyValue qua URL nữa
    // App sẽ tự fetch history từ Dataverse bằng recordId
    // Điều này tránh lỗi "Request Too Long" khi history quá lớn

    // ===== USER LOGIN INFO =====
    const globalContext = Xrm.Utility.getGlobalContext();
    const userSettings = globalContext.userSettings;
    let phongBanResult = "";
    const user = {
        id: userSettings.userId.replace(/[{}]/g, ""),
    };
    if (user.id) {
        // BƯỚC 2: Từ ID Sale, truy vấn bảng Employee để lấy Phòng ban
        const employeeData = await Xrm.WebApi.retrieveRecord(
            EMPLOYEE_LOGICAL_NAME,
            user.id,
            "?$select=fullname&$expand=crdfd_Employee2($select=cr1bb_departmenteng)",
        );
        phongBanResult = employeeData.crdfd_Employee2
            ? employeeData.crdfd_Employee2.cr1bb_departmenteng
            : "";
        console.log("[SOD Debug] Đã tìm thấy Phòng ban:", phongBanResult);
    } else {
        console.warn(
            "[SOD Debug] Khách hàng chưa được gán nhân viên Sale phụ trách.",
        );
    }

    // ===== PAGE INPUT =====
    // [UPDATED] Bỏ historyValue - App sẽ tự fetch từ DB bằng recordId
    const pageInput = {
        pageType: "webresource",
        webresourceName: "new_XuathangOutboundLoadweb",
        // Đảm bảo định dạng key=value&key=value
        data:
            "recordId=" +
            recordId +
            "&customerId=" +
            customer.id +
            "&phongBan=" +
            encodeURIComponent(phongBanResult) +
            "&saleID=" +
            customer.saleID,
        // [REMOVED] historyValue - không truyền qua URL nữa để tránh lỗi Request Too Long
    };

    // ===== NAVIGATION OPTIONS ======
    const navigationOptions = {
        target: 2, // Dialog
        width: window.innerWidth * 0.85,
        height: window.innerHeight * 0.9,
        position: 1,
        title: "Chốt giao SOD",
    };

    Xrm.Navigation.navigateTo(pageInput, navigationOptions)
        .then(() => console.log("[SOD Debug] Mở WebResource thành công"))
        .catch((err) => console.error("[SOD Debug] Lỗi khi mở WebResource:", err));
}

function onLoad_OpenSODDialog(executionContext) {
    if (canOpenSODDialog(executionContext)) {
        openSODDialog(executionContext);
    } else {
        console.log("[SOD Debug] Điều kiện mở Dialog không");
    }
}

function onSave_OpenSODDialog(executionContext) {
    console.log("[SOD Debug] === EVENT: ONSAVE STARTED ===");
    const eventArgs = executionContext.getEventArgs();
    const saveMode = eventArgs.getSaveMode();
    console.log("[SOD Debug] Save Mode:", saveMode);

    const validSaveModes = [1, 2, 59, 70];
    if (!validSaveModes.includes(saveMode)) {
        return;
    }

    const formContext = executionContext.getFormContext();

    setTimeout(function () {
        if (canOpenSODDialog(formContext)) {
            openSODDialog(formContext);
        }
    }, 1000);
}

async function getCustomerInfo(formContext) {
    const customerAttr = formContext.getAttribute(CUSTOMER_FIELD_NAME);
    if (!customerAttr || !customerAttr.getValue()) return null;

    const customerRef = customerAttr.getValue()[0];
    const customerId = customerRef.id.replace(/[{}]/g, "");
    const customerTable = customerRef.entityType; // 'account' hoặc 'contact'
    let saleID = "";
    try {
        const customerData = await Xrm.WebApi.retrieveRecord(
            customerTable,
            customerId,
            "?$select=_crdfd_salename_value&$expand=crdfd_Salename($select=crdfd_employeeid, _crdfd_username_value)",
        );
        saleID = customerData.crdfd_Salename._crdfd_username_value
            ? customerData.crdfd_Salename._crdfd_username_value
            : "";
    } catch (error) {
        console.error("[SOD Debug] Lỗi khi truy vấn bảng Customer:", error);
    }
    return {
        id: customerId,
        saleID: saleID,
    };
}
