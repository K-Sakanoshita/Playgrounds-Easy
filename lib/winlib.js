// Display Status(progress&message)
class WinCont {

    constructor() { this.modal_mode = false }

    splash(mode) {
        document.getElementById("splash_image").setAttribute("src", Conf.splashUrl);
        let act = mode ? { backdrop: 'static', keyboard: false } : 'hide';
        $('#modal_splash').modal(act);
    }

    spinner(view) {
        let display = view ? "remove" : "add";
        global_spinner.classList[display]('d-none');
        if (typeof list_spinner !== "undefined") list_spinner.classList[display]('d-none');
    }

    makeMenu(menulist, domid) {
        let dom = document.getElementById(domid);
        dom.innerHTML = Conf.menu_list.template;
        Object.keys(menulist).forEach(key => {
            let link, confkey = menulist[key];
            if (confkey.linkto.indexOf("html:") > -1) {
                let span = dom.querySelector("span:first-child");
                span.innerHTML = confkey.linkto.substring(5);
                link = span.cloneNode(true);
            } else {
                let alink = dom.querySelector("a:first-child");
                alink.setAttribute("href", confkey.linkto);
                alink.setAttribute("target", confkey.linkto.indexOf("javascript:") == -1 ? "_blank" : "");
                alink.querySelector("span").innerHTML = confkey.comment;
                link = alink.cloneNode(true);
            };
            dom.appendChild(link);
            if (confkey["divider"]) dom.insertAdjacentHTML("beforeend", Conf.menu_list.divider);
        });
        dom.querySelector("a:first-child").remove();
        dom.querySelector("span:first-child").remove();
    }

    // open modal window(p: title,message,mode(yes no close),callback_yes,callback_no,callback_close,append,openid)
    // append: append button(Conf.detailView.buttons)
    openModal(p) {
        let MW = "modal_window";
        document.getElementById(`${MW}_title`).innerHTML = p.title;
        document.getElementById(`${MW}_message`).innerHTML = p.message;
        document.getElementById(`${MW}_menu`).hidden = p.menu ? false : true;
        let delEvents = function (keyn) {
            let dom = document.getElementById(`${MW}_${keyn}`);
            dom.removeEventListener("click", function () { p[`callback_${keyn}`]() });
        };
        let addButton = function (keyn) {
            let dom = document.getElementById(`${MW}_${keyn}`);
            dom.hidden = true;
            if (p.mode.indexOf(keyn) > -1) {
                dom.innerHTML = keyn;
                dom.removeEventListener("click", function () { p[`callback_${keyn}`]() });
                dom.addEventListener("click", function () { p[`callback_${keyn}`]() });
                dom.hidden = false;
            };
        };
        ["yes", "no", "close"].forEach(keyn => addButton(keyn));
        $(`#${MW}`).modal({ backdrop: true, keyboard: true });
        winCont.modal_mode = true;
        $(`#${MW}`).off('shown.bs.modal');
        $(`#${MW}`).on('shown.bs.modal', () => {
            ["yes", "no", "close"].forEach(keyn => delEvents(keyn));
            if (!winCont.modal_mode) $(`#${MW}`).modal('hide');
        });                 // Open中にCloseされた時の対応
        $(`#${MW}`).off('hidden.bs.modal');
        $(`#${MW}`).on('hidden.bs.modal', () => {
            ["yes", "no", "close"].forEach(keyn => delEvents(keyn));
            p[`callback_${p.callback_close ? "close" : "no"}`]();
        });    // "x" click
        let chtml = "";
        if (p.append !== undefined) {      // append button
            p.append.forEach(p => {
                chtml += `<button class="${p.btn_class}" onclick="${p.code}"><i class="${p.icon_class}"> <span>${p.btn_name}</span></i>`;
                chtml += `</button>`;
            });
        };
        modal_footer.innerHTML = chtml;
    }

    closeModal() {              // close modal window(note: change this)
        winCont.modal_mode = false;
        $(`#modal_window`).modal('hide');
        [`#modal_window_yes`, `#modal_window_no`, `#modal_window_close`].forEach(id => $(id).off('click'));
    }

    openOSM(param_text) {        // open osm tab
        window.open(`https://osm.org/${param_text.replace(/[?&]*/, '', "")}`, '_blank');
    }

    resizeWindows() {
        console.log("Window: resize.");
        let mapWidth = winCont.isSmartPhone() ? window.innerWidth : window.innerWidth * 0.3;
        mapWidth = mapWidth < 350 ? 350 : mapWidth;
        if (typeof baselist !== "undefined") baselist.style.width = mapWidth + "px";
        if (typeof mapid !== "undefined") mapid.style.height = window.innerHeight + "px";
    }

    isSmartPhone() {
        if (window.matchMedia && window.matchMedia('(max-device-width: 640px)').matches) {
            return true;
        } else {
            return false;
        };
    }
}
