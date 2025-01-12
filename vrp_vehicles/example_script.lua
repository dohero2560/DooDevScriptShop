
local config = {
    license = "LS-01FVUP342", -- Your license key
    resourceName = GetCurrentResourceName(), -- ชื่อ resource อัตโนมัติ
    verifyEndpoint = "http://yourserver.com/api/verify-license", -- URL สำหรับ verify
    ipifyEndpoint = "https://api.ipify.org", -- URL สำหรับดึง IP
    maxRetries = 3, -- จำนวนครั้งที่จะลองใหม่ถ้าดึง IP ไม่สำเร็จ
    retryDelay = 5000 -- ระยะเวลารอระหว่างการลองใหม่ (มิลลิวินาที)
}

-- Function to get IP from ipify
function GetPublicIP(callback)
    local retryCount = 0
    
    local function tryGetIP()
        PerformHttpRequest(config.ipifyEndpoint, function(errorCode, resultData, resultHeaders)
            if errorCode == 200 then
                print("^2Successfully got public IP: " .. resultData .. "^7")
                callback(resultData)
            else
                retryCount = retryCount + 1
                if retryCount < config.maxRetries then
                    print("^1Failed to get IP, retrying in " .. (config.retryDelay/1000) .. " seconds... (Attempt " .. retryCount .. "/" .. config.maxRetries .. ")^7")
                    Citizen.SetTimeout(config.retryDelay, tryGetIP)
                else
                    print("^1Failed to get public IP after " .. config.maxRetries .. " attempts. Using fallback method.^7")
                    -- ใช้วิธีที่ 2 เป็น fallback
                    GetLocalIP(callback)
                end
            end
        end, 'GET', '', { ['Content-Type'] = 'application/json' })
    end
    
    tryGetIP()
end

-- Function to get IP from server convar (วิธีที่ 2)
function GetLocalIP(callback)
    local ip = GetConvar("web_baseUrl", "none")
    
    if ip == "none" then
        -- ถ้าไม่มี web_baseUrl ให้ใช้ endpoint
        ip = GetConvar("endpoint_add_tcp", "none")
        if ip == "none" then
            -- ถ้าไม่มีทั้งคู่ ใช้ค่า default
            ip = "0.0.0.0"
        end
    end
    
    -- ลบ port ออกถ้ามี
    ip = string.gsub(ip, ":%d+", "")
    -- ลบ protocol ออกถ้ามี
    ip = string.gsub(ip, "https?://", "")
    
    print("^3Using local IP: " .. ip .. "^7")
    callback(ip)
end

-- Start the verification process
AddEventHandler('onResourceStart', function(resourceName)
    if (GetCurrentResourceName() ~= resourceName) then
        return
    end
    
    print("^3Starting license verification process...^7")
    -- เริ่มด้วยการดึง IP จาก ipify
    GetPublicIP(function(ip)
        config.serverIP = ip
        VerifyLicense()
    end)
end)

-- Function to verify license
function VerifyLicense()
    print("^3Verifying license with IP: " .. config.serverIP .. "^7")
    
    PerformHttpRequest(config.verifyEndpoint, function(errorCode, resultData, resultHeaders)
        if errorCode == 200 then
            local data = json.decode(resultData)
            if data.valid then
                print("^2License verified successfully!^7")
                if data.user then
                    print("^3License Owner: " .. (data.user.username or "Unknown") .. "#" .. (data.user.discriminator or "0000") .. "^7")
                    print("^3Discord ID: " .. (data.user.discordId or "Unknown") .. "^7")
                end
                StartResource()
            else
                print("^1License verification failed: " .. (data.error or "Unknown error") .. "^7")
                StopResource(GetCurrentResourceName())
            end
        else
            print("^1Failed to verify license. Error code: " .. tostring(errorCode) .. "^7")
            StopResource(GetCurrentResourceName())
        end
    end, 'POST', json.encode({
        license = config.license,
        serverIP = config.serverIP,
        resourceName = config.resourceName
    }), { ['Content-Type'] = 'application/json' })
end