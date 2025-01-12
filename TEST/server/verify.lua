local isVerified = false
local isVerifying = false
local lastVerificationTime = 0

-- Forward declarations
local VerifyLicense

local function PrintHeader()
    print([[^2
╔═══════════════════════════════════════════════╗
║             DoDev License System              ║
╚═══════════════════════════════════════════════╝^7]])
end

local function PrintSuccess(message)
    print('^2[SUCCESS] ^7' .. message)
end

local function PrintError(message)
    print('^1[ERROR] ^7' .. message)
end

local function PrintInfo(message)
    print('^5[INFO] ^7' .. message)
end

local function PrintWarning(message)
    print('^3[WARNING] ^7' .. message)
end

local function LogDebug(message)
    if Config.Debug then
        print('^6[DEBUG] ^7' .. message)
    end
end

local function ValidateIP(ip)
    if not ip or ip == "" or ip == "0.0.0.0" then
        LogDebug('Invalid IP: Empty or default IP detected')
        return false
    end

    local parts = {ip:match("(%d+)%.(%d+)%.(%d+)%.(%d+)")}
    if #parts ~= 4 then
        LogDebug('Invalid IP format: ' .. ip)
        return false
    end

    for _, part in ipairs(parts) do
        local num = tonumber(part)
        if not num or num < 0 or num > 255 then
            LogDebug('Invalid IP range: ' .. ip)
            return false
        end
    end
    return true
end

local function GetServerIP()
    local ip = "0.0.0.0"
    local ipReceived = false
    
    PerformHttpRequest("https://api.ipify.org", function(errorCode, resultData, resultHeaders)
        if errorCode == 200 and resultData then
            ip = resultData:gsub("\n", ""):gsub(" ", "")
            if ValidateIP(ip) then
                ipReceived = true
                LogDebug('Valid IP from ipify: ' .. ip)
            else
                LogDebug('Invalid IP received from ipify: ' .. ip)
            end
        else
            LogDebug('Failed to get IP from ipify, error: ' .. tostring(errorCode))
        end
    end, 'GET', '', { ['Accept'] = 'text/plain' })
    
    -- Wait for response with timeout
    local timeout = 0
    while not ipReceived and timeout < 50 do
        Citizen.Wait(100)
        timeout = timeout + 1
    end
    
    if not ValidateIP(ip) then
        LogDebug('Final IP validation failed: ' .. ip)
        return nil
    end
    
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

local function WaitForVerification()
    local timeout = 0
    while isVerifying and timeout < 100 do -- รอสูงสุด 10 วินาที
        Citizen.Wait(100)
        timeout = timeout + 1
    end
    return isVerified
end

-- Implement VerifyLicense
VerifyLicense = function(retry)
    retry = retry or 0
    isVerifying = true
    
    if retry == 0 then
        PrintHeader()
        PrintInfo('Starting license verification...')
    else
        PrintWarning('Retrying verification... (Attempt ' .. retry + 1 .. '/' .. Config.MaxRetries .. ')')
    end
    
    local serverIP = GetServerIP()
    if not serverIP then
        LogDebug('Failed to get valid server IP. Verification aborted.')
        isVerifying = false
        HandleVerificationFailure(retry)
        return false
    end
    
    local requestData = {
        license = Config.License,
        serverIP = serverIP,
        resourceName = Config.ResourceName
    }
    LogDebug('Request Data: ' .. json.encode(requestData))
    
    PerformHttpRequest(Config.VerifyEndpoint, function(errorCode, resultData, resultHeaders)
        LogDebug('Response Code: ' .. tostring(errorCode))
        
        if errorCode == 200 then
            local success, data = pcall(json.decode, resultData)
            if success and data then
                if data.valid then
                    isVerified = true
                    lastVerificationTime = os.time()
                    
                    print([[^2
╔═══════════════════════════════════════════════╗
║              License Verified!                 ║
╠═══════════════════════════════════════════════╣
║^7 Discord: ]] .. data.user.username .. '#' .. data.user.discriminator .. [[                  ^2
║^7 License: ]] .. Config.License .. [[                ^2
║^7 Resource: ]] .. Config.ResourceName .. [[               ^2
╚═══════════════════════════════════════════════╝^7]])
                    
                    TriggerEvent('yourScript:licenseVerified')
                else
                    local errorMsg = data.error or 'Invalid license'
                    PrintError('Verification failed: ' .. errorMsg)
                    isVerified = false
                    HandleVerificationFailure(retry)
                end
            else
                PrintError('Invalid response format')
                isVerified = false
                HandleVerificationFailure(retry)
            end
        else
            PrintError('HTTP Error: ' .. errorCode)
            isVerified = false
            HandleVerificationFailure(retry)
        end
        isVerifying = false
    end, 'POST', json.encode(requestData), { 
        ['Content-Type'] = 'application/json',
        ['Accept'] = 'application/json'
    })
    
    return WaitForVerification()
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
    
    if VerifyLicense() then
        PrintSuccess('Script enabled successfully!')
        StartAutoReconnect()
    else
        PrintError('Script disabled - License verification failed')
    end
end)

exports('isLicenseVerified', function()
    return isVerified
end)

exports('getLastVerificationTime', function()
    return lastVerificationTime
end)

function IsScriptEnabled()
    if isVerifying then
        LogDebug('Waiting for verification to complete...')
        return WaitForVerification()
    end
    if not isVerified then
        LogDebug('Access blocked: License not verified')
        return false
    end
    return true
end 