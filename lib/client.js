window.__ModuleLoader__.load({
	id: "dsh-restart-web",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var react = require("react");
		var h = react.createElement;

		// ── styles (injected once) ──────────────────────────────────────
		var styleId = "dsh-restart-web-styles";
		var styled = false;
		function ensureStyles() {
			if (styled) return;
			styled = true;
			var el = document.createElement("style");
			el.id = styleId;
			el.textContent = [
				".dsh-rst-page{padding:20px 24px;max-width:480px}",
				".dsh-rst-page h3{margin:0 0 8px;font-size:16px;font-weight:600}",
				".dsh-rst-page p{margin:0 0 16px;font-size:13px;line-height:1.6;opacity:.7}",
				".dsh-rst-card{border:1px solid rgba(128,128,128,.2);border-radius:10px;padding:16px}",
				".dsh-rst-card-row{display:flex;align-items:center;justify-content:space-between;gap:12px}",
				".dsh-rst-card-txt{font-size:14px;font-weight:500}",
				".dsh-rst-btn{padding:8px 20px;border-radius:7px;border:1px solid #ef4444;",
				" background:#ef4444;color:#fff;cursor:pointer;font-size:13px;font-weight:500;",
				" transition:background .12s;white-space:nowrap}",
				".dsh-rst-btn:hover{background:#dc2626}",
				".dsh-rst-btn:disabled{opacity:.7;cursor:default}",
				".dsh-rst-confirm{margin-top:14px;padding:14px;border-radius:8px;",
				" background:rgba(128,128,128,.08);border:1px solid rgba(239,68,68,.3);",
				" display:flex;flex-direction:column;gap:12px}",
				".dsh-rst-confirm p{margin:0;font-size:13px;line-height:1.5}",
				".dsh-rst-confirm-btns{display:flex;gap:10px}",
				".dsh-rst-confirm-btns button{flex:1;padding:7px 0;border-radius:6px;",
				" cursor:pointer;font-size:13px;border:1px solid rgba(128,128,128,.3);",
				" background:transparent;color:inherit;transition:background .12s}",
				".dsh-rst-confirm-btns button:hover{background:rgba(128,128,128,.1)}",
				".dsh-rst-go{background:#ef4444!important;color:#fff!important;border-color:#ef4444!important}",
				".dsh-rst-go:hover{background:#dc2626!important}",
				".dsh-rst-spin{display:inline-block;animation:dsh-rst-rot 1s linear infinite}",
				"@keyframes dsh-rst-rot{from{transform:rotate(0)}to{transform:rotate(360deg)}}"
			].join("");
			document.head.appendChild(el);
		}

		// ── component ───────────────────────────────────────────────────
		function RestartSection() {
			react.useEffect(function () { ensureStyles(); }, []);

			var st = react.useState("idle");
			var current = st[0];
			var setState = st[1];

			function doRestart() {
				setState("restarting");
				fetch("/api/dsh-restart", { method: "POST" })
					.then(function () {})
					.catch(function () {})
					.then(function () {
						setTimeout(function () {
							try { window.location.reload(); } catch (_e) {}
						}, 5000);
					});
			}

			if (current === "restarting") {
				return h("div", { className: "dsh-rst-page" },
					h("h3", null, "重启 DeepSeek Harness"),
					h("div", { className: "dsh-rst-card" },
						h("div", { className: "dsh-rst-card-row" },
							h("span", { className: "dsh-rst-card-txt" },
								h("span", { className: "dsh-rst-spin" }, "\u21bb"),
								" 正在重启...页面将在 5 秒后自动刷新"
							)
						)
					)
				);
			}

			var card = h("div", { className: "dsh-rst-card" },
				h("div", { className: "dsh-rst-card-row" },
					h("span", { className: "dsh-rst-card-txt" }, "DeepSeek Harness 进程"),
					h("button", {
						className: "dsh-rst-btn",
						onClick: function () { setState("confirming"); }
					}, "重启")
				)
			);

			if (current === "confirming") {
				return h("div", { className: "dsh-rst-page" },
					h("h3", null, "重启 DeepSeek Harness"),
					h("p", null,
						"点击下方\u201c重启\u201d按钮可以重启整个 DSH 进程。",
						"重启后所有会话状态会保留（已持久化），页面会自动重新连接。"
					),
					card,
					h("div", { className: "dsh-rst-confirm" },
						h("p", null,
							"确认要重启 DeepSeek Harness 吗？",
							h("br"),
							"重启会断开当前会话，页面将在 5 秒后自动刷新。"
						),
						h("div", { className: "dsh-rst-confirm-btns" },
							h("button", {
								className: "dsh-rst-go",
								onClick: doRestart
							}, "确认重启"),
							h("button", {
								onClick: function () { setState("idle"); }
							}, "取消")
						)
					)
				);
			}

			return h("div", { className: "dsh-rst-page" },
				h("h3", null, "重启 DeepSeek Harness"),
				h("p", null,
					"点击下方\u201c重启\u201d按钮可以重启整个 DSH 进程。",
					"重启后所有会话状态会保留（已持久化），页面会自动重新连接。"
				),
				card
			);
		}

		// ── plugin ──────────────────────────────────────────────────────
		var inject = ["slots"];

		function apply(ctx) {
			ctx.slots.inject("settings.section", function () {
				ctx.slots.register(
					{
						name: "settings.section",
						id: "dsh-restart",
						order: 200,
						label: "重启"
					},
					RestartSection
				);
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
