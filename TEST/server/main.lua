-- รอให้การตรวจสอบ license เสร็จสมบูรณ์ก่อน
Citizen.CreateThread(function()
    Citizen.Wait(1000) -- รอให้ระบบเริ่มต้นก่อน
    
    if not IsScriptEnabled() then 
        print([[^1
╔═══════════════════════════════════════════════╗
║              Script Disabled!                  ║
║         Please check your license key          ║
╚═══════════════════════════════════════════════╝^7]])
        return 
    end
    
    print([[^2
╔═══════════════════════════════════════════════╗
║              Script Enabled!                   ║
║          Everything is working fine           ║
╚═══════════════════════════════════════════════╝^7]])
    -- Your script initialization code here
end)

-- ตัวอย่างการใช้งานใน event
RegisterNetEvent('yourScript:serverEvent')
AddEventHandler('yourScript:serverEvent', function()
    if not IsScriptEnabled() then 
        PrintError('Event blocked - License not verified')
        return 
    end
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