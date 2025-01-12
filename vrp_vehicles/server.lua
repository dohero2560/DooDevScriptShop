local config = {
    licenseKey = "YOUR-LICENSE-KEY",
    serverIP = "0.0.0.0",
    resourceName = "vrp_vehicles",
    authEndpoint = "http://localhost:3000/api/verify-license"
}

local isVerified = false

-- Function to verify license
local function verifyLicense()
    local payload = {
        license = config.licenseKey,
        serverIP = config.serverIP,
        resourceName = config.resourceName
    }

    PerformHttpRequest(config.authEndpoint, function(errorCode, resultData, resultHeaders)
        if errorCode == 200 then
            local result = json.decode(resultData)
            if result.valid then
                print("^2[VRP_VEHICLES] License verified successfully!^7")
                print("^2[VRP_VEHICLES] Welcome " .. result.user.username .. "!^7")
                isVerified = true
            else
                print("^1[VRP_VEHICLES] License verification failed!^7")
                print("^1[VRP_VEHICLES] Error: " .. (result.error or "Unknown error") .. "^7")
                Citizen.Wait(1000) -- Wait for 1 second before stopping the resource
                StopResource(GetCurrentResourceName())
            end
        else
            print("^1[VRP_VEHICLES] Failed to verify license. Error code: " .. errorCode .. "^7")
            Citizen.Wait(1000) -- Wait for 1 second before stopping the resource
            StopResource(GetCurrentResourceName())
        end
    end, 'POST', json.encode(payload), { ['Content-Type'] = 'application/json' })
end

-- Verify license on resource start
AddEventHandler('onResourceStart', function(resourceName)
    if (GetCurrentResourceName() ~= resourceName) then
        return
    end
    
    -- Get server IP
    local serverIP = GetConvar("web_baseUrl", "0.0.0.0")
    config.serverIP = serverIP:gsub("http://", ""):gsub("https://", ""):gsub("/", "")
    
    -- Verify license
    Citizen.CreateThread(function()
        Citizen.Wait(1000) -- Wait for everything to initialize
        verifyLicense()
    end)
end)

-- Example vehicle spawn function (protected by license verification)
function SpawnVehicle(vehicleModel, coords)
    if not isVerified then
        print("^1[VRP_VEHICLES] Cannot spawn vehicle - License not verified^7")
        return false
    end

    -- Your vehicle spawn logic here
    local vehicle = CreateVehicle(vehicleModel, coords.x, coords.y, coords.z, coords.heading, true, false)
    return vehicle
end

-- Example vehicle save function (protected by license verification)
function SaveVehicle(vehicleId)
    if not isVerified then
        print("^1[VRP_VEHICLES] Cannot save vehicle - License not verified^7")
        return false
    end

    -- Your vehicle save logic here
    return true
end

-- Export functions for other resources to use
exports('SpawnVehicle', SpawnVehicle)
exports('SaveVehicle', SaveVehicle)

-- Periodic license check (every 6 hours)
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(6 * 60 * 60 * 1000) -- 6 hours
        if isVerified then
            verifyLicense()
        else
            print("^1[VRP_VEHICLES] Periodic check failed - License not verified^7")
            Citizen.Wait(1000)
            StopResource(GetCurrentResourceName())
            break -- Exit the loop
        end
    end
end)

-- Add some example commands
RegisterCommand('spawncar', function(source, args)
    if not isVerified then
        TriggerClientEvent('chat:addMessage', source, {
            color = {255, 0, 0},
            multiline = true,
            args = {"SYSTEM", "License not verified - Cannot spawn vehicle"}
        })
        return
    end

    if #args < 1 then
        TriggerClientEvent('chat:addMessage', source, {
            color = {255, 0, 0},
            multiline = true,
            args = {"SYSTEM", "Please specify a vehicle model"}
        })
        return
    end

    local vehicleModel = args[1]
    -- Add your spawn logic here
end)

-- Event handler for client requests
RegisterServerEvent('vrp_vehicles:requestVehicle')
AddEventHandler('vrp_vehicles:requestVehicle', function(vehicleData)
    if not isVerified then
        TriggerClientEvent('vrp_vehicles:error', source, 'License not verified')
        return
    end

    -- Process vehicle request
    -- Your logic here
end) 