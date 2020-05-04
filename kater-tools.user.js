// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.5.11
// @description  切換界面語系，覆寫「@某人」的連結（避免找不到資源的錯誤），用 UID 取得可標註其他使用者的文字、使用者頁面貼文排序、使用者頁面討論排序與搜尋
// @author       LianSheng

// @include      https://kater.me/*
// @exclude      https://kater.me/api/*

// @grant        GM_registerMenuCommand
// @grant        GM_info

// @run-at       document-start
// @noframes

// @require      https://greasyfork.org/scripts/402133-toolbox/code/Toolbox.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.4/clipboard.min.js
// @require      https://cdn.jsdelivr.net/npm/pikaday/pikaday.js
// @require      https://greasyfork.org/scripts/14208-datejs/code/Datejs.js

// @compatible   chrome Chrome 71 + Tampermonkey + v0.5.6 可正常使用 （這裡的版本爲作者測試過的最後版本）
// @compatible   firefox Firefox 70 + Tampermonkey + v0.4.1 可正常使用 （這裡的版本爲作者測試過的最後版本）

// @license      MIT
// ==/UserScript==

// 0.4.1 起，所有程式碼改從外部呼叫。
// Tampermonkey 貌似會對各個腳本做一個版本的 snapshot 之類的操作
// 所以只要腳本不更新或重新安裝，無法透過 require 外部檔案來變更內容…
// 0.5.5 起，還是回到常規做法... XD

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

  // 個人頁面排序貼文 (v0.5.5)
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
            } catch (e) {}
            break;
          case "groups":
            try {
              json["groups"][each.id] = {};
              json["groups"][each.id]["attributes"] = each.attributes;
            } catch (e) {}
            break;
          case "discussions":
            try {
              json["discussions"][each.id] = {};
              json["discussions"][each.id]["attributes"] = each.attributes;
            } catch (e) {}
            break;
          case "posts":
            try {
              json["post"][each.id] = {};
              json["post"][each.id]["attributes"] = each.attributes;
              json["post"][each.id]["relationships"] = each.relationships;
            } catch (e) {}
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
    });
  }

  // 個人頁面排序貼文 - 選項 (v0.5.5)
  function insertPostOpt() {
    let optionTop = `
      <div id="us_userPageOptionTop" style="margin-bottom: 1rem;">
        <div class="ButtonGroup Dropdown dropdown itemCount6">
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
    moreButton.addEventListener("click", function (e) {
      let sort = document.querySelector("div#us_userPageOptionTop ul button[active=true]").getAttribute("data-sort");
      let offset = parseInt(list.getAttribute("data-offset")) + 20;
      list.setAttribute("data-offset", offset);

      postSort(uid, sortField[sort]["link"], sortField, offset);
    });

  }

  // 個人頁面排序討論 (v0.5.6)
  let sortField = {
    latest: {
      link: "-createdAt",
      name: "最新討論"
    },
    oldest: {
      link: "createdAt",
      name: "最舊討論"
    },
    latestPost: {
      link: "-lastPostedAt",
      name: "近期回覆"
    },
    oldestPost: {
      link: "lastPostedAt",
      name: "考古專用"
    },
    maxCount: {
      link: "-commentCount",
      name: "最多回覆"
    },
    minCount: {
      link: "commentCount",
      name: "乏人問津"
    }
  };

  function discussionSort(offset = 0) {
    message("正在處理請求...", 1);

    let dateStart = document.querySelector("div#us_dateStart > input").getAttribute("data-date");
    let dateEnd = document.querySelector("div#us_dateEnd > input").getAttribute("data-date");
    let search = document.querySelector("div#us_userPageOptionTop input[type=search]").value;
    let sortName = document.querySelector("div#us_userPageOptionTop ul button[active=true]").getAttribute("data-sort");
    let sort = sortField[sortName]["link"];
    let uid = app.current.user.data.id;
    let name = app.current.user.data.attributes.username;

    let url = `https://kater.me/api/discussions?filter[user]=${uid}&filter[q]=${search} author:${name} created:${dateStart}..${dateEnd}&sort=${sort}&page[offset]=${offset}`;

    let list = document.querySelector("ul.DiscussionList-discussions");
    list.setAttribute("data-offset", offset);
    list.setAttribute("data-search", search);

    fetch(url).then(function (response) {
      return response.json();
    }).then(function (json) {
      // 資料預處理
      json["users"] = {};
      json["tags"] = {};
      json["posts"] = {};

      // 當返回資料爲空時
      if (json.included === undefined) {
        console.log("[Kater Tools] 請求已完成，沒有符合資料");
        message("請求已完成，沒有符合資料", 0);
        return;
      }

      json.included.forEach(function (each) {
        switch (each.type) {
          case "users":
            try {
              json["users"][each.id] = {};
              json["users"][each.id]["attributes"] = each.attributes;
            } catch (e) {}
            break;
          case "tags":
            try {
              json["tags"][each.id] = {};
              json["tags"][each.id]["attributes"] = each.attributes;
            } catch (e) {}
            break;
          case "posts":
            try {
              json["post"][each.id] = {};
              json["post"][each.id]["attributes"] = each.attributes;
              json["post"][each.id]["relationships"] = each.relationships;
            } catch (e) {}
            break;
        }
      });

      // 資料預處理 結束

      if (offset == 0) {
        list.innerHTML = "";
      }

      json.data.forEach(function (discussion) {
        let tags = "";
        let follow = "";
        let recipient = "";

        discussion.relationships.tags.data.forEach(function (tag) {
          tags += `
            <span class="TagLabel colored" style="color: ${json["tags"][tag.id]["attributes"]["color"]}; background-color: ${json["tags"][tag.id]["attributes"]["color"]};">
              <span class="TagLabel-text">
                <i class="icon ${json["tags"][tag.id]["attributes"]["icon"]} "></i> 
                ${json["tags"][tag.id]["attributes"]["name"]}
              </span>
            </span>
          `;
        });

        if (discussion.relationships.recipientUsers.data.length > 0) {
          discussion.relationships.recipientUsers.data.forEach(function (user) {
            recipient += `
              <span class="RecipientLabel">
                <span class="RecipientLabel-text">
                  <span class="username">${json["users"][user.id]["attributes"]["username"]}</span>
                </span>
              </span>
            `;
          });
        }

        if (discussion.attributes.subscription != undefined && discussion.attributes.subscription == "follow") {
          follow = `          
            <ul class="DiscussionListItem-badges badges">
            <li class="item-subscription"><span class="Badge Badge--following " title="" data-original-title="關注"><i
                  class="icon fas fa-star Badge-icon"></i></span></li>
            </ul>
          `;
        }

        list.innerHTML += `
          <li data-id="${discussion.id}">
            <div class="DiscussionListItem">
              <div class="ButtonGroup Dropdown dropdown DiscussionListItem-controls itemCount4">

                <!-- 我就爛 0u0b -->
                <!--<button class="Dropdown-toggle Button Button--icon Button--flat Slidable-underneath Slidable-underneath--right"
                  data-toggle="dropdown"><i class="icon fas fa-ellipsis-v Button-icon"></i><span
                    class="Button-label"></span><i class="icon fas fa-caret-down Button-caret"></i></button>-->
                <!--<ul class="Dropdown-menu dropdown-menu ">
                  <li class="item-subscription"><button class=" hasIcon" type="button" title="取消關注"><i
                        class="icon far fa-star Button-icon"></i><span class="Button-label">取消關注</span></button>
                  </li>
                  <li class="Dropdown-separator"></li>
                  <li class="item-rename"><button class=" hasIcon" type="button" title="重命名"><i
                        class="icon fas fa-pencil-alt Button-icon"></i><span
                        class="Button-label">重命名</span></button></li>
                  <li class="item-tags"><button class=" hasIcon" type="button" title="編輯節點"><i
                        class="icon fas fa-tag Button-icon"></i><span class="Button-label">編輯節點</span></button></li>
                </ul>-->

              </div><a class="Slidable-underneath Slidable-underneath--left Slidable-underneath--elastic disabled"><i
                  class="icon fas fa-check "></i></a>
              <div class="DiscussionListItem-content Slidable-content read"><a href="/u/144" class="DiscussionListItem-author"
                  title="" data-original-title="Van⦗qu⦘ish⁇ 發佈於 14 小時前"><img class="Avatar "
                    src="${json["users"][discussion.relationships.user.data.id]["attributes"]["avatarUrl"]}"></a>
                ${follow}                           
                <a href="/d/${discussion.id}" class="DiscussionListItem-main">
                  <h3 class="DiscussionListItem-title">${discussion.attributes.title}</h3>
                  <ul class="DiscussionListItem-info">
                    <li class="item-tags gamification">
                      <span class="TagsLabel">
                        ${tags}
                      </span>
                    </li>
                    <li class="item-recipients">
                      <span class="RecipientsLabel ">${recipient}</span>
                    </li>
                    <li class="item-discussion-votes"><span class="DiscussionListItem-votes" title="點讚"><i
                          class="icon far fa-thumbs-up "></i>${discussion.attributes.votes}</span></li>
                    <li class="item-discussion-views">${discussion.attributes.views}</li>
                  </ul>
                </a><span class="DiscussionListItem-count" title="">${discussion.attributes.commentCount}</span>
              </div>
            </div>
          </li>
        `;
      });

      message("請求已完成", 0);
    }).catch(function (e) {
      message("取得資料時遇到錯誤！", 2);
    });
  }

  // 個人頁面排序討論 - 選項 (v0.5.6)
  function insertDiscussionOpt() {
    let optionTop = `
      <div id="us_userPageOptionTop" style="margin-bottom: 1rem;">
        <div class="ButtonGroup Dropdown dropdown itemCount2" style="vertical-align: initial;">
          <button class="Dropdown-toggle Button" data-toggle="dropdown" aria-expanded="false">
            <span class="Button-label">最新討論</span>
            <i class="icon fas fa-caret-down Button-caret"></i>
          </button>
          <ul class="Dropdown-menu dropdown-menu">
            <li class="">
              <button active="true" class="hasIcon" type="button" data-sort="latest">
                <i class="icon fas fa-check Button-icon"></i>
                <span class="Button-label">最新討論</span>
              </button>
              <button class="hasIcon" type="button" data-sort="oldest">
                <span class="Button-label">最舊討論</span>
              </button>
              <button class="hasIcon" type="button" data-sort="latestPost">
                <span class="Button-label">近期回覆</span>
              </button>
              <button class="hasIcon" type="button" data-sort="oldestPost">
                <span class="Button-label">考古專用</span>
              </button>
              <button class="hasIcon" type="button" data-sort="maxCount">
                <span class="Button-label">最多回覆</span>
              </button>
              <button class="hasIcon" type="button" data-sort="minCount">
                <span class="Button-label">乏人問津</span>
              </button>
            </li>
          </ul>
        </div>
        <div class="Search" style="display: inline-block; padding-left: 1rem;">
          <div class="Search-input">
            <input class="FormControl" type="search" placeholder="搜尋" title="不能搜尋英文數字跟冒號，避免觸發系統搜尋問題" style="width: 8rem;">
          </div>
        </div>
        <div class="Search" style="display: inline-block; padding-left: 1rem;">
          <div id="us_dateStart" class="Search-input">
            <input class="FormControl" placeholder="起始日期" style="width: 9rem;">  
          </div>
        </div>
        <div class="Search" style="display: inline-block; padding-left: 1rem;">
          <div id="us_dateEnd" class="Search-input">
            <input class="FormControl" placeholder="結束日期" style="width: 9rem;">
          </div>
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

    addHTML(optionTop, "div.sideNavContainer div.DiscussionsUserPage", "afterbegin");
    addHTML(optionBottom, "div.sideNavContainer div.DiscussionsUserPage", "beforeend");

    // Pikaday 日期選擇器
    // 我不太會用 Pikaday 的初始化選項，某些目的只好硬幹
    let dateStart = document.querySelector("div#us_dateStart > input");
    let dateEnd = document.querySelector("div#us_dateEnd > input");

    new Pikaday({
      field: dateStart,
      format: 'YYYY-MM-DD',
      setDefaultDate: true,
      defaultDate: new Date("2019-10-17"),
      minDate: new Date("2019-10-17"),
      maxDate: new Date(),
      i18n: {
        previousMonth: '上月',
        nextMonth: '下月',
        months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        weekdaysShort: ['日', '一', '二', '三', '四', '五', '六']
      },
      onSelect: function () {
        let date = Date.parse(this._d).toString("yyyy-MM-dd");
        dateStart.value = date;
        dateStart.setAttribute("data-date", date);
        discussionSort();
      }
    });

    new Pikaday({
      field: dateEnd,
      format: 'YYYY-MM-DD',
      setDefaultDate: true,
      defaultDate: new Date(),
      minDate: new Date("2019-10-17"),
      maxDate: new Date(),
      i18n: {
        previousMonth: '上月',
        nextMonth: '下月',
        months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        weekdaysShort: ['日', '一', '二', '三', '四', '五', '六']
      },
      onSelect: function () {
        let date = Date.parse(this._d).toString("yyyy-MM-dd");
        dateEnd.value = date;
        dateEnd.setAttribute("data-date", date);
        discussionSort();
      }
    });

    dateStart.value = "";
    dateEnd.value = "";
    dateStart.setAttribute("data-date", Date.parse(new Date("2019-10-17")).toString("yyyy-MM-dd"));
    dateEnd.setAttribute("data-date", Date.parse(new Date()).toString("yyyy-MM-dd"));

    // Pikaday 日期選擇器 結束


    // 隱藏原生按鈕（載入更多）
    try {
      document.querySelector("div.DiscussionList-loadMore").style.display = "none";
    } catch (e) {}

    // 上選單點擊事件
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

        discussionSort();
      })
    });
    // 上選單點擊事件 結束

    // 搜尋框事件 
    let searchInput = document.querySelector("div#us_userPageOptionTop input[type=search]");
    let list = document.querySelector("ul.DiscussionList-discussions");
    searchInput.addEventListener("keyup", function (e) {
      searchInput.value = searchInput.value.replace(/[a-zA-Z0-9:]/g, "");

      // Enter
      if (e.keyCode === 13) {
        discussionSort();
      }
    });


    // 載入更多按鈕點擊事件
    let moreButton = document.querySelector("div#us_userPageOptionBottom button");
    list.setAttribute("data-offset", "0");
    moreButton.addEventListener("click", function (e) {
      let offset = parseInt(list.getAttribute("data-offset")) + 20;
      discussionSort(offset);
    });
  }

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

  // 訊息框，採用原生樣式 (Alert)，只是放到右上角
  // 0 綠色、1 黃色、2 紅色
  let expireMsg = {};

  function message(msg, type = 0) {
    let typeField = ["success", "warning", "error"];
    let randomID = Math.random().toString(36).substr(2, 6);

    let block = `
      <div id="us_messageBlock" data-id="${randomID}" class="AlertManager">
        <div class="AlertManager-alert">
          <div class="Alert Alert--${typeField[type]}" style="position: fixed; top: 2rem; right: 2rem; width: 10rem;">
            <span class="Alert-body">${msg}</span>
          </div>
        </div>
      </div>
    `;

    document.querySelector("div#us_messageArea").innerHTML += block;

    // 不能使用 setTimeout 或 setInterval （會卡死其他部件）
    // 而此類腳本也不便於利用 worker
    // 只好在下方 main function 輪詢物件 expireMsg
    expireMsg[randomID] = Date.now() + 2000;
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
      // 添加討論日期選取器的 css 於 head
      if (document.querySelectorAll("link#us_pikaday").length == 0) {
        console.log("[Kater Tools] Add Pikaday");
        addStyleLink("https://cdn.jsdelivr.net/npm/pikaday/css/pikaday.css", "us_pikaday");
      }

      // 貼文
      if (document.querySelectorAll("div.sideNavContainer div.PostsUserPage").length != 0 &&
        document.querySelectorAll("div.PostsUserPage div#us_userPageOptionTop").length == 0) {
        insertPostOpt();
      }

      // 討論
      if (document.querySelectorAll("div.sideNavContainer div.DiscussionsUserPage").length != 0 &&
        document.querySelectorAll("div.DiscussionsUserPage div#us_userPageOptionTop").length == 0) {
        insertDiscussionOpt();
      }

      if(document.querySelectorAll("div#us_messageArea").length == 0){
        document.querySelector("div#app").innerHTML += `<div id="us_messageArea"></div>`
      }

      // 訊息框自動刪除（詳見 message()）
      for (let [key, value] of Object.entries(expireMsg)) {
        if (Date.now() > value) {
          document.querySelector(`div#us_messageBlock[data-id="${key}"]`).remove();
          delete expireMsg[key];
        }

        console.log(expireMsg);
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