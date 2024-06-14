const fengari = require('fengari-web');
const lua = fengari.lua;
const lauxlib = fengari.lauxlib;
const lualib = fengari.lualib;

export function executeLuaScript(scriptPath, variables) {
    let L = lauxlib.luaL_newstate();

    /* Load Lua libraries */
    lualib.luaL_openlibs(L);

    /* Push variables onto the Lua stack */
    for (let [name, value] of Object.entries(variables)) {
        lua.lua_pushstring(L, lua.to_luastring(value));
        lua.lua_setglobal(L, lua.to_luastring(name));
    }

    /* Load and execute the Lua script */
    let luaCode = fs.readFileSync(scriptPath, 'utf8');
    if (lauxlib.luaL_loadstring(L, lua.to_luastring(luaCode))) {
        throw new Error(lua.to_jsstring(lua.lua_tostring(L, -1)));
    }

    /* Run the Lua code */
    if (lua.lua_pcall(L, 0, -1, 0)) {
        throw new Error(lua.to_jsstring(lua.lua_tostring(L, -1)));
    }
}
