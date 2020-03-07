// Misc... 

/************  雜項 (v0.X) ************/

// 通用：檢查網址是否變更
function checkUrl(url) {
    if (url != saveUrl) {
        saveUrl = url;
        return true;
    }
    return false;
}

// 通用：確認是否在某個使用者頁面，若是則回傳該使用者編號，否則回傳 0
function isUserPage() {
    let ck = location.href.match(/kater.me\/u\/([0-9]+)/);
    if (ck != null) {
        return Number(ck[1]);
    }
    return 0;
}

// 通用：確認是否在某個討論串，若是則回傳該串編號，否則回傳 0
function isDiscussionPage() {
    let ck = location.href.match(/kater.me\/d\/([0-9]+)/);
    if (ck != null) {
        return Number(ck[1]);
    }
    return 0;
}

// 【全站頁面】
// 
function darkMode() {
    let css = `
        :root {
            --main_bg: #112;
            --main_color: #ccf;
            --border: #123;
        }
        html {
            background: var(--main_bg);
        }
        header.App-header {
            background: var(--main_bg);
        }
        body .App-content {
            border-top: var(--border);
        }
        a#home-link {
            color: var(--main_color);
        }
    `;
    addStyleImportant(css, "html", "us_darkMode");
    console.info("us_darkMode");
}
// darkMode();

// 【使用者頁面】
// 移除使用者名稱的連結（導向同一個頁面真的意義不明）
// （未完成）
function removeUsernameLink() {
    let target = document.querySelectorAll("h2.UserCard-identity:not(.us_clone)");

    if (target.length > 0) {
        target = target[0];

        let clone = target.cloneNode(true);
        clone.classList.add("us_clone")
        let html = (function (el) {
            return el.outerHTML;
        })(clone)

        target.style.display = "none";
        addHTML(html, "div.UserCard-profile", "afterbegin");
    }
}

// 【討論串頁面】

/*********  雜項 (v0.X) (END) *********/

(function () {
    'use strict';

    // v0.4: 雜項
    setInterval(function () {
        if (isUserPage()) {
            // removeUsernameLink();
        }
    }, 500);
})