-- ตรวจสอบ license ก่อนทำงาน
if not IsScriptEnabled() then 
    print('^1[ERROR] Script disabled - Invalid license^7')
    return 
end

-- ตัวอย่างการใช้งานใน event
RegisterNetEvent('yourScript:serverEvent')
AddEventHandler('yourScript:serverEvent', function()
    if not IsScriptEnabled() then return end
    -- Your server event code here
end)

-- ตัวอย่างการใช้งานใน command
RegisterCommand('yourcommand', function(source, args)
    if not IsScriptEnabled() then 
        if source > 0 then -- ถ้าเป็น player
            TriggerClientEvent('chat:addMessage', source, {
                color = {255, 0, 0},
                multiline = true,
                args = {'System', 'Command disabled - License not verified'}
            })
        end
        return 
    end
    -- Your command code here
end) 