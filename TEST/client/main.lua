-- ตัวอย่างการตรวจสอบ license status จาก client
local isScriptEnabled = false

-- ฟังก์ชันตรวจสอบสถานะ license
local function CheckLicenseStatus()
    local isVerified = exports[GetCurrentResourceName()]:isLicenseVerified()
    if not isVerified then
        if Config.Debug then
            print('^1[License Warning] ^7Script license not verified')
        end
        return false
    end
    return true
end

-- ตรวจสอบสถานะเมื่อ resource เริ่มทำงาน
AddEventHandler('onClientResourceStart', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    
    isScriptEnabled = CheckLicenseStatus()
    if not isScriptEnabled and Config.Debug then
        print('^1[License Warning] ^7Script disabled due to invalid license')
    end
end)

-- ฟังก์ชันสำหรับใช้ในส่วนอื่นๆ ของสคริปต์
function IsScriptEnabled()
    return isScriptEnabled
end

-- ตัวอย่างการใช้งาน
RegisterNetEvent('yourScript:clientEvent')
AddEventHandler('yourScript:clientEvent', function()
    if not IsScriptEnabled() then return end
    -- Your client event code here
end) 