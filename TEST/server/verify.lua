local isVerified = false
local maxRetries = 3
local retryDelay = 5000 -- 5 seconds

local function LogDebug(message)
    if Config.Debug then
        print('^3[License Debug] ^7' .. message)
    end
end

local function GetServerIP()
    local ip = GetConvar("web_baseUrl", "none")
    if ip == "none" then
        -- Fallback methods
        ip = GetConvar("sv_endpoint", "")
        if ip == "" then
            ip = GetConvar("ip", "0.0.0.0")
        end
    end
    return ip
end

local function VerifyLicense(retry)
    retry = retry or 0
    
    LogDebug('Attempting license verification... (Attempt ' .. retry + 1 .. '/' .. maxRetries .. ')')
    
    PerformHttpRequest(Config.VerifyEndpoint, function(errorCode, resultData, resultHeaders)
        if errorCode == 200 then
            local data = json.decode(resultData)
            if data.valid then
                isVerified = true
                LogDebug('License verified successfully!')
                -- ทำงานอื่นๆ หลังจาก verify สำเร็จ
                TriggerEvent('yourScript:licenseVerified')
            else
                LogDebug('License verification failed: ' .. (data.error or 'Unknown error'))
                if retry < maxRetries - 1 then
                    Citizen.SetTimeout(retryDelay, function()
                        VerifyLicense(retry + 1)
                    end)
                else
                    print('^1[ERROR] License verification failed after ' .. maxRetries .. ' attempts. Script will not work.^7')
                end
            end
        else
            LogDebug('HTTP Error: ' .. errorCode)
            if retry < maxRetries - 1 then
                Citizen.SetTimeout(retryDelay, function()
                    VerifyLicense(retry + 1)
                end)
            else
                print('^1[ERROR] Failed to connect to verification server after ' .. maxRetries .. ' attempts.^7')
            end
        end
    end, 'POST', json.encode({
        license = Config.License,
        serverIP = GetServerIP(),
        resourceName = Config.ResourceName
    }), { ['Content-Type'] = 'application/json' })
end

-- Start verification when resource starts
AddEventHandler('onResourceStart', function(resourceName)
    if (GetCurrentResourceName() ~= resourceName) then
        return
    end
    
    LogDebug('Resource starting - Initiating license verification')
    VerifyLicense()
end)

-- Export function to check verification status
exports('isLicenseVerified', function()
    return isVerified
end)

-- Function to check if script should continue
function IsScriptEnabled()
    if not isVerified then
        LogDebug('Blocked: License not verified')
        return false
    end
    return true
end 