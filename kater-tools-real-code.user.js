// ==UserScript==
// @name                Kater Tools (Real Part)
// @version             0.5.5
// @description         腳本 Kater Tools 實際程式碼
// @include             https://kater.me/*
// @exclude             https://kater.me/api/*
// @author              LianSheng
// @license             MIT
// ==/UserScript==


(function () {
	// 更改界面語系 (v0.1)
	// 用 fetch 改寫。統一整體腳本風格 (v0.3.2)
	function changeLang() {
		let nowLang = app.data.locale;
		let selectLang = (nowLang == "en") ? "zh-hant" : "en";
		let yourUID = app.session.user.data.id;
		let dataObj = {
			"data": {
				"type": "users",
				"id": yourUID,
				"attributes": {
					"preferences": {
						"locale": selectLang
					}
				}
			}
		};

		let option = {
			body: JSON.stringify(dataObj),
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
				'x-csrf-token': app.session.csrfToken,
				'x-http-method-override': 'PATCH'
			},
			method: 'POST'
		}

		fetch(`https://kater.me/api/users/${yourUID}`, option).then(function (response) {
			let status = response.status;
			if (status == 200) {
				location.reload(true);
			} else {
				console.log(`Locale change failed: status code ${status}`);
				alert(`切換語系失敗，請重試。\nStatus code = ${status}`);
			}
		});
	}

	// 覆寫提及使用者連結 (v0.2)
	function overwriteUserMention(node) {
		let re = /kater.me\/u\/(.+)$/;
		let name = node.href.match(re)[1];
		node.classList.add("overwrited");

		fetch(`https://kater.me/api/users?filter%5Bq%5D=${name}&page%5Blimit%5D=1`).then(function (response) {
			return response.json();
		}).then(function (json) {
			node.href = `https://kater.me/u/${json.data[0].id}`;
		});
	}

	// 用 UID 提及使用者 (v0.3)
	// 暫時以僅複製爲解法，使用者需自行貼上（避免一些奇怪問題）
	function mentionUserById(uid) {
		let footer = document.querySelector("ul.TextEditor-controls.Composer-footer");
		let display = document.querySelector("div#us_display");
		let input = document.querySelector("input#us_searchUid")
		let result = document.querySelector("div#us_result");
		let result_avatar = document.querySelector("div#us_resultAvatar");
		let result_name = document.querySelector("div#us_resultName");

		fetch(`https://kater.me/api/users/${uid}`).then(function (response) {
			return response.json();
		}).then(function (json) {
			let avatar = json.data.attributes.avatarUrl;
			let avatar_exist = (typeof avatar != typeof null);
			let name = json.data.attributes.displayName;
			let clipboard = new ClipboardJS(result);

			if (avatar_exist) {
				result_avatar.style.background = `url("${avatar}")`;
				result_avatar.style.backgroundSize = "contain";
			} else {
				result_avatar.style.background = "#ccc";
			}

			result_name.innerText = name;
			result.setAttribute("data-clipboard-text", `@${name}`);

			result.onclick = function () {
				let textarea = document.querySelector("textarea.FormControl.Composer-flexible");
				textarea.focus();
				clipboard.destroy();

				result_avatar.style.background = "#ccc";
				result_name.innerText = "已複製";
				setTimeout(function () {
					input.value = "";
					result_name.innerText = "Username";
					display.style.display = "none";
				}, 1000);
			}
		});
	}

	// 個人頁面排序貼文 (v0.5)
	function postSort(uid, sort, sortField, offset = 0) {
		let url = `https://kater.me/api/posts?filter[user]=${uid}&filter[type]=comment&page[offset]=${offset}&page[limit]=20&sort=${sort}`;
		let list = document.querySelector("ul.PostsUserPage-list");
		
		fetch(url).then(function (response) {
			return response.json();
		}).then(function (json) {
			// 資料預處理
			json["users"] = {};
			json["discussions"] = {};
			json["groups"] = {};
			json["posts"] = {};

			json.included.forEach(function (each) {
				switch (each.type) {
					case "users":
						try {
							json["users"][each.id] = {};
							json["users"][each.id]["attributes"] = each.attributes;
						} catch (e) {
							console.log("[Kater Tools] 資料預處理例外：沒有 users");
						}
						break;
					case "groups":
						try {
							json["groups"][each.id] = {};
							json["groups"][each.id]["attributes"] = each.attributes;
						} catch (e) {
							console.log("[Kater Tools] 資料預處理例外：沒有 groups");
						}
						break;
					case "discussions":
						try {
							json["discussions"][each.id] = {};
							json["discussions"][each.id]["attributes"] = each.attributes;
						} catch (e) {
							console.log("[Kater Tools] 資料預處理例外：沒有 discussions");
						}
						break;
					case "posts":
						try {
							json["post"][each.id] = {};
							json["post"][each.id]["attributes"] = each.attributes;
							json["post"][each.id]["relationships"] = each.relationships;
						} catch (e) {
							console.log("[Kater Tools] 資料預處理例外：沒有 posts");
						}
						break;
				}
			});

			// 資料預處理 結束

			if (offset == 0) {
				list.innerHTML = "";
			}

			json.data.forEach(function (post) {
				list.innerHTML += `
					<li>
						<div class="PostsUserPage-discussion">於 <a href="/d/${post.relationships.discussion.data.id}/${post.attributes.number}">${json["discussions"][post.relationships.discussion.data.id]["attributes"]["title"]}</a></div>
						<article class="Post CommentPost">
							<div>
								<header class="Post-header">
									<ul>
										<li class="item-user">
											<div class="PostUser History">
												<h3><a href="/u/${uid}"><img class="Avatar PostUser-avatar"
															src="${json["users"][post.relationships.user.data.id]["attributes"]["avatarUrl"]}"><span
															class="UserOnline"><i class="icon fas fa-circle "></i></span><span
															class="username">${json["users"][post.relationships.user.data.id]["attributes"]["username"]}</span></a><button type="button"
														class="fas fa-sort-down" id="username-history" data-toggle="dropdown"
														data-userid="${uid}"></button>
													<ul id="dropdown-history" class="Dropdown-menu dropdown-menu"></ul>
												</h3>
												<!-- 對不起我懶的改這裡QAQ -->
												<!--<ul class="PostUser-badges badges">
													<li class="item-group5"><span class="Badge Badge--group--5 " title=""
															style="background-color: rgb(51, 154, 240);" data-original-title="創始成員"><i
																class="icon fas fa-crown Badge-icon"></i></span></li>
												</ul>-->
											</div>
										</li>
										<li class="item-meta">
											<div class="Dropdown PostMeta"><a class="Dropdown-toggle" data-toggle="dropdown"><time
														pubdate="true" datetime="${localeTime(post.attributes.createdAt)}" title="${localeTime(post.attributes.createdAt, true)}"
														data-humantime="true">${timeAgo(post.attributes.createdAt)}</time></a>
												<div class="Dropdown-menu dropdown-menu"><span class="PostMeta-number">發佈 #${post.attributes.number}</span> <span
														class="PostMeta-time"><time pubdate="true"
															datetime="${localeTime(post.attributes.createdAt)}">${localeTime(post.attributes.createdAt, true)}</time></span> <span
														class="PostMeta-ip"></span><input class="FormControl PostMeta-permalink"></div>
											</div>
										</li>
									</ul>
								</header>
								<div class="Post-body">
									${post.attributes.contentHtml}
								</div>
								<aside class="Post-actions PostactionsRestyle">
									<ul>
										<li class="item-upvote" title="推"><button class="Post-vote Post-upvote hasIcon" style="color:"
												type="button"><i class="icon fas fa-thumbs-up Button-icon"></i></button></li>
										<li class="item-points"><button class=" hasIcon" type="button" title="查看點讚的人"><label
													class="Post-points">1</label></button></li>
										<li class="item-downvote" title="踩"><button class="Post-vote Post-downvote hasIcon" style=""
												type="button"><i class="icon fas fa-thumbs-down Button-icon"></i></button></li>
										<li class="item-reply"><button class="Button Button--link" type="button" title="回覆"><i
													class="fas fa-reply"></i><span class="Button-label">回覆</span></button></li>
										<li>
											<div class="ButtonGroup Dropdown dropdown Post-controls itemCount4"><button
													class="Dropdown-toggle Button Button--icon Button--flat" data-toggle="dropdown"><i
														class="icon fas fa-ellipsis-h Button-icon"></i><span class="Button-label"></span><i
														class="icon fas fa-caret-down Button-caret"></i></button>
												<ul class="Dropdown-menu dropdown-menu Dropdown-menu--right">
													<li class="item-edit"><button class=" hasIcon" type="button" title="編輯"><i
																class="icon fas fa-pencil-alt Button-icon"></i><span
																class="Button-label">編輯</span></button></li>
													<li class="item-hide"><button class=" hasIcon" type="button" title="刪除"><i
																class="icon far fa-trash-alt Button-icon"></i><span
																class="Button-label">刪除</span></button></li>
												</ul>
											</div>
										</li>
									</ul>
								</aside>
								<footer class="Post-footer">
									<ul></ul>
								</footer>
							</div>
						</article>
						<div class="Post-quoteButtonContainer"></div>
					</li>
				`;
			});

			function localeTime(timeCreatedAt, human = false) {
				if (human) {
					return Date.parse(new Date("2020-05-02T10:21:38+00:00")).toString("yyyy-MM-dd HH:mm:ss");
				} else {
					return Date.parse(new Date("2020-05-02T10:21:38+00:00")).toString("yyyy-MM-ddTHH:mm:ss+08:00");
				}
			}

			function timeAgo(timeCreatedAt) {
				let now = new Date();
				let create = new Date(timeCreatedAt);
				let ms = now - create;
				let s = parseInt(ms / 1000);

				if (s > 7 * 24 * 60 * 60) {
					return Date.parse(create).toString("yyyy/MM/dd HH:mm:ss");
				} else if (s > 24 * 60 * 60) {
					return `${parseInt((s/24/60/60).toString())} 天前`;
				} else if (s > 60 * 60) {
					return `${parseInt((s/60/60).toString())} 小時前`;
				} else if (s > 60) {
					return `${parseInt((s/60).toString())} 分前`;
				} else {
					return `${s} 秒前`;
				}
			}
		});
	}

	// 個人頁面排序貼文 - 選項 (v0.5)
	function insertPostOpt() {
		let optionTop = `
			<div id="us_userPageOptionTop" style="margin-bottom: 1rem;">
				<div class="ButtonGroup Dropdown dropdown itemCount2">
					<button class="Dropdown-toggle Button" data-toggle="dropdown" aria-expanded="false">
						<span class="Button-label">最新</span>
						<i class="icon fas fa-caret-down Button-caret"></i>
					</button>
					<ul class="Dropdown-menu dropdown-menu">
						<li class="">
							<button active="true" class="hasIcon" type="button" data-sort="latest">
								<i class="icon fas fa-check Button-icon"></i>
								<span class="Button-label">最新</span>
							</button>
							<button class="hasIcon" type="button" data-sort="oldest">
								<span class="Button-label">最舊</span>
							</button>
						</li>
					</ul>
				</div>
			</div>
		`;
		let optionBottom = `
			<div id="us_userPageOptionBottom" style="text-align: center;">
				<button class="Button" type="button">
					<span class="Button-label">載入更多</span>
				</button>
			</div>
		`;

		addHTML(optionTop, "div.sideNavContainer div.PostsUserPage", "afterbegin");
		addHTML(optionBottom, "div.sideNavContainer div.PostsUserPage", "beforeend");

		// 隱藏原生按鈕（載入更多）
		try {
			document.querySelector("div.PostsUserPage-loadMore").style.display = "none";
		} catch (e) {}

		// 上選單點擊事件
		let sortField = {
			latest: {
				link: "-createdAt",
				name: "最新"
			},
			oldest: {
				link: "createdAt",
				name: "最舊"
			}
		};
		let uid = app.current.user.data.id;
		let sortList = document.querySelectorAll("div#us_userPageOptionTop ul button");
		let selected = document.querySelector("div#us_userPageOptionTop button.Dropdown-toggle > span");
		sortList.forEach(function (each) {
			each.addEventListener("click", function (e) {
				let sort = each.getAttribute("data-sort");
				let originActive = document.querySelector("div#us_userPageOptionTop ul button[active=true]");
				originActive.removeAttribute("active");
				originActive.querySelector("i").remove();
				each.setAttribute("active", "true");
				each.insertAdjacentHTML("afterbegin", `<i class="icon fas fa-check Button-icon"></i>`);
				selected.innerText = sortField[sort]["name"];

				postSort(uid, sortField[sort]["link"], sortField);
			})
		});
		// 上選單點擊事件 結束

		// 載入更多按鈕點擊事件
		let moreButton = document.querySelector("div#us_userPageOptionBottom button");
		let list = document.querySelector("ul.PostsUserPage-list");
		list.setAttribute("data-offset", "0");		
		moreButton.addEventListener("click", function (e){
			let sort = document.querySelector("div#us_userPageOptionTop ul button[active=true]").getAttribute("data-sort");
			let offset = parseInt(list.getAttribute("data-offset")) + 20;
			list.setAttribute("data-offset", offset);

			postSort(uid, sortField[sort]["link"], sortField, offset);
		});

	}

	// 貼上彩色文字 (v0.?)
	// （暫時只支援單行，多行的話需自行分行...）
	function pasteColorText(paste_target) {
		paste_target.addEventListener('paste', handlepaste);

		function handlepaste(e) {
			let types, pastedData, savedContent;

			// 在 Clipboard API 中支援 'text/html' 格式的瀏覽器 (Chrome, Firefox 22+)
			if (e && e.clipboardData && e.clipboardData.types && e.clipboardData.getData) {
				types = e.clipboardData.types;

				if (((types instanceof DOMStringList) && types.contains("text/html")) ||
					(types.indexOf && types.indexOf('text/html') !== -1)) {
					pastedData = e.clipboardData.getData('text/html');
					processPaste(pastedData);

					// 避免預設動作、阻止事件冒泡
					e.stopPropagation();
					e.preventDefault();

					return false;
				}
			}

			savedContent = document.createDocumentFragment();
			while (paste_target.childNodes.length > 0) {
				savedContent.appendChild(paste_target.childNodes[0]);
			}

			waitForPastedData(paste_target, savedContent);
			return true;
		}

		function waitForPastedData(element, savedContent) {
			// 判斷是否已處理完成，否則等待一段時間後再試一次
			if (element.childNodes && element.childNodes.length > 0) {
				var pastedData = element.innerHTML;

				element.innerHTML = "";
				element.appendChild(savedContent);

				processPaste(pastedData);
			} else {
				setTimeout(function () {
					waitForPastedData(element, savedContent)
				}, 20);
			}
		}

		function processPaste(pastedData) {
			const regex = /<[^<>\/]+?\ style=\".*?(?<!-)color:(.+?);.*?\">([^<>]+?)<\/.+?>/gm;
			let m;

			let string = "";
			while ((m = regex.exec(pastedData)) !== null) {
				// 避免無限循環
				if (m.index === regex.lastIndex) {
					regex.lastIndex++;
				}

				m.forEach(function (match, groupIndex) {
					// 顏色代碼
					if (groupIndex == 1) {
						// 支援兩種最常用的格式，hsl() 等罕見用法就放生了吧XD
						if (match.includes("rgb")) {
							// 格式：rgb(rrr, ggg, bbb)
							let colors = match.replace(/[^0-9,]/g, "").split(",");

							let hex = "";
							colors.forEach(function (each) {
								hex += ("0" + parseInt(each).toString(16)).slice(-2);
							})

							string += `[color=#${hex}]`;
						} else {
							// 預設格式：#rrggbb
							match = match.replace(" ", "");
							string += `[color=${match}]`;
						}
					}
					// 要上色的文字
					if (groupIndex == 2) {
						string += `${match}[/color]`;
					}
				});
			}

			string = unescape(string);
			// 避免小括號被解析成連結
			string = replaceAll(string, "\(", "\\(");
			string = replaceAll(string, "\)", "\\)");

			// 避免重音符 (backtick) 被解析成程式碼區塊
			string = replaceAll(string, "`", "\\`");

			// 避免無論打多少空格都會只剩下一個空格
			string = replaceAll(string, " ", " ");

			// 替換殘留 HTML Entity （不知道爲什麼 unescape 沒有全部替換）
			string = replaceAll(string, "&gt;", ">");
			string = replaceAll(string, "&lt;", "<");
			string = replaceAll(string, "&amp;", "&");

			paste_target.value += string;
		}

		function replaceAll(str, find, replace) {
			function escapeRegExp(string) {
				return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
			}

			return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
		}
	}

	(function () {
		'use strict';
		// v0.1: 切換語言
		GM_registerMenuCommand("切換語言", function () {
			changeLang();
		});

		// v0.2: 覆寫提及使用者連結
		setInterval(function () {
			let match_nodes = document.querySelectorAll("a.UserMention:not(.overwrited)");
			if (match_nodes.length > 0) {
				match_nodes.forEach(function (node) {
					overwriteUserMention(node);
				});
			}
		}, 100);

		// v0.3: 用 UID 提及使用者（與原生選單共存）
		// (重寫) 避免 MutationObserver 無限迴圈問題，改用 setInterval 偵測
		let markold = "init";
		let max_uid = 0;
		fetch("https://kater.me/api/users?sort=-joinedAt&page[limit]=1").then(function (response) {
			return response.json();
		}).then(function (json) {
			max_uid = json.data[0].id;
		}).then(function () {
			setInterval(function () {
				// 撰寫貼文框的下方功能列
				let nodes = document.querySelectorAll("li.TextEditor-toolbar");
				if (nodes.length > 0) {
					let node = nodes[0];
					let display, button;
					// 自定義搜尋框
					if (document.querySelectorAll("div#us_display").length == 0) {
						let appendDisplay = `<div id="us_display" style="cursor: pointer; user-select: none; display: inline-block; width: 10rem; min-width: min-content; border: 2px solid #333; border-radius: 4px; position: relative; bottom: 0; right: 0; z-index: 9999; background: #eee;"><div style="border-bottom: 1px solid #000; text-align: center; user-select: none; background: #e88; font-weight: bold;">用 UID 搜尋要標註的人</div><div><input id="us_searchUid" style="width: 100%; text-align: center;"></div><div id="us_result"><table><tr><td><div id="us_resultAvatar" style="height: 2rem; width: 2rem; display: inline-block; margin: 0.5rem; border-radius: 100px; background: #ccc; background-size: contain;"></div></td><td><div id="us_resultName" style="width: calc(100% - 3rem); display: inline-block;">Username</div></td></tr></table></div><input id="us_hiddenInput" style="display: none;"></div>`;
						addHTML(appendDisplay, "ul.TextEditor-controls.Composer-footer", "beforeend");
						display = document.querySelector("div#us_display");
						display.style.display = "none";
					}
					// 自定義搜尋按鈕
					if (document.querySelectorAll("button#us_tagByUid").length == 0) {
						let appendButton = `<button id="us_tagByUid" class="Button Button--icon Button--link hasIcon" type="button" title="用 UID 標註他人" data-original-title="用 UID 標註他人"><i class="icon fas fa-user-tag" style="color: #e88;"></i><span class="Button-label">用 UID 標註他人</span></button>`;
						addHTML(appendButton, "li.TextEditor-toolbar", "beforeend");
						button = document.querySelector("button#us_tagByUid");
						button.addEventListener("click", function (e) {
							let input = document.querySelector("input#us_searchUid")
							if (display.style.display == "none") {
								display.style.display = "inline-block";
								input.focus();
							} else {
								display.style.display = "none";
								document.querySelector("textarea.FormControl.Composer-flexible").focus();
							}

							input.addEventListener("input", function (e) {
								input.value = input.value.replace(/[^0-9]/g, "");
								let search = parseInt(input.value);

								if (search != "") {
									if (search <= max_uid) {
										mentionUserById(search);
									}
								}
							});
						});
					}
				}
			}, 200);
		});

		// v0.5: 個人頁面排序
		setInterval(function () {
			if (document.querySelectorAll("div.sideNavContainer div.PostsUserPage").length != 0 &&
				document.querySelectorAll("div#us_userPageOptionTop").length == 0) {
				insertPostOpt();
			}
		}, 100);


		// v0.?: 解析貼上的彩色文字
		if (false) {
			let id = setInterval(function () {
				let edit_area = document.querySelectorAll("textarea.FormControl.Composer-flexible");
				if (edit_area.length > 0) {
					pasteColorText(edit_area[0]);
					console.log("v0.5 Add");
					clearInterval(id);
				}
			}, 100)
		}
	})();
})();