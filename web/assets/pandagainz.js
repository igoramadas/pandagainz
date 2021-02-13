// PandaGainz JS

class PG {
    static init = async () => {
        for (let key of Object.keys(PG.dom)) {
            PG.dom[key] = document.getElementById(key.replace(/([A-Z])/g, "-$1").toLowerCase())

            // Add helper transition class on panels.
            if (key.indexOf("Panel") > 0) {
                PG.dom[key].classList.add("tpanel")
            }
        }

        try {
            await PG.getSession()

            // Init routes and events.
            PG.setRoutes()
            PG.setEvents()

            // Check cookie consent.
            if (Cookies.get("cookieconsent") != "1") {
                PG.dom.cookiePanel.classList.remove("hidden")
                PG.dom.cookiePanel.classList.add("visible")
            } else {
                PG.dom.cookiePanel.parentNode.removeChild(PG.dom.cookiePanel)
            }
        } catch (ex) {
            console.error(ex)
        }
    }

    // Add client side routes.
    static setRoutes = () => {
        PG.router = new Router({
            mode: "hash",
            page404: function (path) {
                console.log('"/' + path + '" Page not found')
            }
        })

        PG.router.add("", function () {
            document.getElementsByClassName("loading")[0].style.display = "none"
            PG.dom.inputPanel.getElementsByClassName("button")[0].disabled = false

            PG.switchPanel(PG.dom.inputPanel)
            document.title = "PandaGainz"
        })

        PG.router.add("report/(:any)", function (apiKey) {
            document.getElementsByClassName("loading")[0].style.display = ""
            PG.dom.inputPanel.getElementsByClassName("button")[0].disabled = true

            PG.getReport(apiKey)
        })

        PG.router.add("apikey-help", function () {
            PG.dom.apikeyHelpPanel.getElementsByClassName("screenshot")[0].src = "/images/apikey.png"
            PG.switchPanel(PG.dom.apikeyHelpPanel)
            document.title = "PandaGainz - API key help"
        })

        PG.router.add("about", function () {
            PG.switchPanel(PG.dom.aboutPanel)
            document.title = "PandaGainz - About"
        })

        PG.router.addUriListener()
        PG.router.check()
    }

    // Bind events to inputs and
    static setEvents = () => {
        PG.dom.butGetReport.onclick = function () {
            if (PG.dom.txtApiKey.value && PG.dom.txtApiKey.value.length >= 20) {
                PG.router.navigateTo(`report/${PG.dom.txtApiKey.value}`)
            } else {
                PG.dom.txtApiKey.focus()
            }
        }

        // Validate API key input.
        PG.dom.txtApiKey.addEventListener("keyup", PG.txtApiKeyValidate)
        PG.txtApiKeyValidate()

        // Cookie notice.
        PG.dom.butCookie.onclick = function () {
            Cookies.set("cookieconsent", "1", {expires: 999})
            PG.dom.cookiePanel.classList.remove("visible")
            PG.dom.cookiePanel.classList.add("hidden")
        }
    }

    // On key up on the input
    static txtApiKeyValidate = function (event) {
        PG.dom.butGetReport.disabled = PG.dom.txtApiKey.value.length < 20

        if (event && event.keyCode === 13) {
            event.preventDefault()
            PG.dom.butGetReport.click()
        }
    }

    // DOM MANIPULATION
    // --------------------------------------------------------------------------

    // All dom elements that will be cached as variables.
    static dom = {
        inputPanel: null,
        txtApiKey: null,
        chkRemember: null,
        butGetReport: null,
        icoGetReport: null,

        reportPanel: null,
        reportRows: null,

        tableTotalDeposit: null,
        tableTotalWithdrawal: null,
        tableTotalBalance: null,
        tableTotalFees: null,
        tableTotalProfit: null,

        apikeyHelpPanel: null,
        aboutPanel: null,

        errorPanel: null,

        cookiePanel: null,
        butCookie: null
    }

    // Currently visible panel.
    static activePanel = null

    // Switches the current visible panel.
    static switchPanel = (panel) => {
        const transition = () => {
            PG.activePanel.style.display = "none"
            panel.style.display = "block"
            const show = () => {
                panel.classList.add("active")
                PG.activePanel = panel
            }
            setTimeout(show, 15)
        }

        if (PG.activePanel) {
            PG.activePanel.classList.remove("active")
            setTimeout(transition, 305)
        } else {
            panel.style.display = "block"
            panel.classList.add("active")
            PG.activePanel = panel
        }
    }

    // Sets the text of a panel element.
    static setInnerText = (parent, className, text) => {
        parent.getElementsByClassName(className)[0].innerText = text
    }

    // Create a table row with the specified cells.
    static createTableRow = (...tdValues) => {
        const tr = document.createElement("tr")
        const td = []

        for (let i = 0; i < tdValues.length; i++) {
            let value = tdValues[i]
            if (!value) value = "0"

            let classInfo = isNaN(value) ? "" : "has-text-right"

            // Last cell is profit. Colour it based on positive or negative values.
            if (i == tdValues.length - 1) {
                if (value > 0) classInfo += " cell-profit"
                if (value < 0) classInfo += " cell-loss"
            }

            td.push(`<td class="${classInfo}">${value}</td>`)
        }

        tr.innerHTML = td.join("")

        return tr
    }

    // BUSINESS LOGIC AND ACTIONS
    // --------------------------------------------------------------------------

    // Fetch saved session and cookie data from server.
    static getSession = async () => {
        const options = {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        }

        try {
            const res = await fetch("/session", options)
            const cookies = await res.json()

            if (cookies.apiKey) {
                PG.dom.txtApiKey.value = cookies.apiKey
                PG.dom.chkRemember.checked = true
            }
        } catch (ex) {
            console.error(ex)
        }
    }

    // Fetch report from server.
    static getReport = async (apiKey) => {
        const url = `/api/report?key=${encodeURIComponent(apiKey)}&remember=${PG.dom.chkRemember.checked}`
        const options = {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        }

        try {
            const res = await fetch(url, options)
            const report = await res.json()

            if (res.status == 200) {
                PG.processReport(report)
            } else {
                PG.showError(res.status, "Could not fetch data")
            }
        } catch (ex) {
            PG.showError(ex, "Error generating report")
        }
    }

    // Process the report.
    static processReport = async (report) => {
        document.getElementsByClassName("loading")[0].style.display = "none"

        PG.dom.reportRows.innerHTML = ""

        let totalValue = 0
        let totalFees = 0

        for (let wallet of report.wallets) {
            const sellProfit = wallet.sellProfit ? PG.rounder(wallet.sellProfit) : 0
            const currentValue = PG.rounder(wallet.currentValue)
            const fees = PG.rounder(wallet.totalFees)
            const tBuy = PG.rounder(wallet.totalBuy)
            const tSell = PG.rounder(wallet.totalSell)
            const tr = PG.createTableRow(wallet.symbol, wallet.buy.length, tBuy, wallet.sell.length, tSell, currentValue, fees, sellProfit)
            PG.dom.reportRows.append(tr)

            totalValue += wallet.currentValue
            totalFees += wallet.totalFees
        }

        PG.dom.tableTotalDeposit.innerText = `Deposit: ${PG.rounder(report.deposit)}`
        PG.dom.tableTotalWithdrawal.innerText = `Withdrawal: ${PG.rounder(report.withdrawal)}`
        PG.dom.tableTotalBalance.innerText = PG.rounder(report.fiatBalance)
        PG.dom.tableTotalFees.innerText = PG.rounder(totalFees)

        if (report.profit >= 0) {
            PG.dom.tableTotalProfit.className = "totals is-profit"
            PG.dom.tableTotalProfit.innerText = `Profit: ${PG.rounder(report.profit)}`
        } else {
            PG.dom.tableTotalProfit.className = "totals is-loss"
            PG.dom.tableTotalProfit.innerText = `Loss: ${PG.rounder(report.profit)}`
        }

        PG.switchPanel(PG.dom.reportPanel)
        document.title = "PandaGainz - Report"
    }

    // Oops, something went wrong...
    static showError = (code, title) => {
        document.getElementsByClassName("loading")[0].style.display = "none"

        if (!title) {
            title = "Something went wrong"
        }

        const errorDivs = PG.dom.errorPanel.getElementsByClassName("container")

        for (let div of errorDivs) {
            if (div.className.indexOf(code.toString()) >= 0) {
                div.style.display = ""
            } else {
                div.style.display = "none"
            }
        }

        PG.setInnerText(PG.dom.errorPanel, "title", title)
        PG.switchPanel(PG.dom.errorPanel)
    }

    // Helper to round to 2 decimal digits.
    static rounder = (value) => {
        return Math.round(value * 100) / 100
    }
}

// Init after document has loaded.
document.addEventListener("DOMContentLoaded", PG.init, false)
