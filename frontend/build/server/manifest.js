const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.C06Ozy2Z.js",app:"_app/immutable/entry/app.fIAQBvZA.js",imports:["_app/immutable/entry/start.C06Ozy2Z.js","_app/immutable/chunks/DImjwblm.js","_app/immutable/chunks/CnglX5le.js","_app/immutable/chunks/Coj744v1.js","_app/immutable/chunks/BqiK9gpZ.js","_app/immutable/entry/app.fIAQBvZA.js","_app/immutable/chunks/CnglX5le.js","_app/immutable/chunks/8PFJ6ntA.js","_app/immutable/chunks/qhCaCgHc.js","_app/immutable/chunks/Dy2_i3Fl.js","_app/immutable/chunks/BCt3m0Z-.js","_app/immutable/chunks/reZitHEr.js","_app/immutable/chunks/D31U_0fv.js","_app/immutable/chunks/Coj744v1.js","_app/immutable/chunks/BqiK9gpZ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BAmQiqS2.js')),
			__memo(() => import('./chunks/1-CV9KQ60n.js')),
			__memo(() => import('./chunks/2-CINhorRi.js')),
			__memo(() => import('./chunks/3-Cj9I41vi.js')),
			__memo(() => import('./chunks/4-DVKNlxxK.js')),
			__memo(() => import('./chunks/5-LZwp9qGB.js')),
			__memo(() => import('./chunks/6-C6cqSTRO.js')),
			__memo(() => import('./chunks/7-E0WIXQ-z.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/business",
				pattern: /^\/business\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: __memo(() => import('./chunks/_server.ts-DZfMZTZS.js'))
			},
			{
				id: "/chat",
				pattern: /^\/chat\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/connect",
				pattern: /^\/connect\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/profile/[userId]",
				pattern: /^\/profile\/([^/]+?)\/?$/,
				params: [{"name":"userId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
