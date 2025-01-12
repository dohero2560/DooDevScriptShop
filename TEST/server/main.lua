-- ตัวอย่างการใช้งาน verification
if not IsScriptEnabled() then return end

-- Your main server code here
RegisterNetEvent('yourScript:someEvent')
AddEventHandler('yourScript:someEvent', function()
    if not IsScriptEnabled() then return end
    -- Your event code here
end) 