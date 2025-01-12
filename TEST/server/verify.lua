local isVerified = false
local lastVerificationTime = 0

-- Forward declarations
local VerifyLicense

local function LogDebug(message)
    if Config.Debug then
        print('^3[License Debug] ^7' .. message)
    end
end

local function GetServerIP()
    local ip = "0.0.0.0"
    
    PerformHttpRequest("https://api.ipify.org", function(errorCode, resultData, resultHeaders)
        if errorCode == 200 then
            ip = resultData
            LogDebug('IP from ipify: ' .. ip)
        else
            LogDebug('Failed to get IP from ipify, error: ' .. tostring(errorCode))
            -- Fallback to default method
            ip = GetConvar("ip", "0.0.0.0")
            LogDebug('Using fallback IP: ' .. ip)
        end
    end, 'GET', '', { ['Accept'] = 'text/plain' })
    
    -- Wait briefly for the async request to complete
    Citizen.Wait(1000)
    
    -- Clean the IP just in case
    ip = ip:gsub("http://", ""):gsub("https://", ""):gsub("/", ""):gsub("\n", ""):gsub(" ", "")
    LogDebug('Final IP: ' .. ip)
    return ip
end

local function HandleVerificationFailure(retry)
    if retry < Config.MaxRetries - 1 then
        Citizen.SetTimeout(Config.RetryDelay, function()
            VerifyLicense(retry + 1)
        end)
    else
        print('^1[ERROR] License verification failed after ' .. Config.MaxRetries .. ' attempts.^7')
        isVerified = false
    end
end

-- Implement VerifyLicense
VerifyLicense = function(retry)
    retry = retry or 0
    
    if retry == 0 then
        LogDebug('Starting license verification...')
    else
        LogDebug('Retrying verification... (Attempt ' .. retry + 1 .. '/' .. Config.MaxRetries .. ')')
    end
    
    -- Log request data
    local requestData = {
        license = Config.License,
        serverIP = GetServerIP(),
        resourceName = Config.ResourceName
    }
    LogDebug('Request Data: ' .. json.encode(requestData))
    
    PerformHttpRequest(Config.VerifyEndpoint, function(errorCode, resultData, resultHeaders)
        LogDebug('Response Code: ' .. tostring(errorCode))
        LogDebug('Response Data: ' .. tostring(resultData))
        
        if errorCode == 200 then
            local success, data = pcall(json.decode, resultData)
            if success and data then
                if data.valid then
                    isVerified = true
                    lastVerificationTime = os.time()
                    LogDebug('License verified successfully!')
                    TriggerEvent('yourScript:licenseVerified')
                else
                    LogDebug('Verification failed: ' .. (data.error or 'Unknown error'))
                    HandleVerificationFailure(retry)
                end
            else
                LogDebug('Invalid response format')
                HandleVerificationFailure(retry)
            end
        else
            -- แสดงข้อมูล error ที่ละเอียดขึ้น
            LogDebug('Full error details:')
            LogDebug('Status: ' .. errorCode)
            LogDebug('Response: ' .. tostring(resultData))
            if resultHeaders then
                for k, v in pairs(resultHeaders) do
                    LogDebug('Header ' .. k .. ': ' .. tostring(v))
                end
            end
            HandleVerificationFailure(retry)
        end
    end, 'POST', json.encode(requestData), { 
        ['Content-Type'] = 'application/json',
        ['Accept'] = 'application/json'
    })
end

local function StartAutoReconnect()
    if Config.AutoReconnect then
        Citizen.CreateThread(function()
            while true do
                Citizen.Wait(Config.ReconnectInterval)
                if os.time() - lastVerificationTime >= (Config.ReconnectInterval / 1000) then
                    LogDebug('Auto-reconnect: Starting verification...')
                    VerifyLicense()
                end
            end
        end)
    end
end

AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    
    LogDebug('Resource starting - Initiating license verification')
    VerifyLicense()
    StartAutoReconnect()
end)

exports('isLicenseVerified', function()
    return isVerified
end)

exports('getLastVerificationTime', function()
    return lastVerificationTime
end)

function IsScriptEnabled()
    if not isVerified then
        LogDebug('Access blocked: License not verified')
        return false
    end
    return true
end 