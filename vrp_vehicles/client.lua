-- Client-side vehicle functions
local isResourceRunning = true

-- Event handler for resource stop
AddEventHandler('onResourceStop', function(resourceName)
    if (GetCurrentResourceName() ~= resourceName) then
        return
    end
    isResourceRunning = false
    -- แจ้งเตือนผู้เล่นว่าสคริปหยุดทำงาน
    TriggerEvent('chat:addMessage', {
        color = {255, 0, 0},
        multiline = true,
        args = {"SYSTEM", "Vehicle system has been stopped - License verification failed"}
    })
end)

local function RequestVehicleSpawn(model, coords)
    if not isResourceRunning then
        TriggerEvent('chat:addMessage', {
            color = {255, 0, 0},
            multiline = true,
            args = {"SYSTEM", "Vehicle system is not running - Please contact an administrator"}
        })
        return
    end
    TriggerServerEvent('vrp_vehicles:requestVehicle', {
        model = model,
        coords = coords
    })
end

-- Event handler for server responses
RegisterNetEvent('vrp_vehicles:error')
AddEventHandler('vrp_vehicles:error', function(message)
    TriggerEvent('chat:addMessage', {
        color = {255, 0, 0},
        multiline = true,
        args = {"SYSTEM", message}
    })
end)

-- Example command for spawning vehicles
RegisterCommand('spawnvehicle', function(source, args)
    if not isResourceRunning then
        TriggerEvent('chat:addMessage', {
            color = {255, 0, 0},
            multiline = true,
            args = {"SYSTEM", "Vehicle system is not running - Please contact an administrator"}
        })
        return
    end

    if #args < 1 then
        TriggerEvent('chat:addMessage', {
            color = {255, 0, 0},
            multiline = true,
            args = {"SYSTEM", "Please specify a vehicle model"}
        })
        return
    end

    local playerPed = PlayerPedId()
    local coords = GetEntityCoords(playerPed)
    RequestVehicleSpawn(args[1], coords)
end) 