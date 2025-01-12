-- ตัวอย่างการตรวจสอบ license status จาก client
local function CheckLicenseStatus()
    local isVerified = exports[GetCurrentResourceName()]:isLicenseVerified()
    if not isVerified then
        print('Warning: Script license not verified')
        return false
    end
    return true
end

-- ตัวอย่างการใช้งาน
RegisterNetEvent('yourScript:clientEvent')
AddEventHandler('yourScript:clientEvent', function()
    if not CheckLicenseStatus() then return end
    -- Your client event code here
end) 