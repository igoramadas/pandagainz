// PandaGainz JS

class PG {
    static init = async () => {
        //paypal.Buttons().render("#paypal-button-container")

        for (let key of Object.keys(PG.dom)) {
            PG.dom[key] = document.getElementById(key.replace(/([A-Z])/g, "-$1").toLowerCase())

            // Add helper transition class on panels.
            if (key.indexOf("Panel") > 0) {
                PG.dom[key].classList.add("tpanel")
            }
        }

        PG.setRoutes()
        PG.setEvents()
    }

    // Add client side routes.
    static setRoutes = () => {
        PG.router = new Router({
            mode: "hash",
            page404: function(path) {
                console.log('"/' + path + '" Page not found')
            }
        })

        PG.router.add("", function() {
            PG.dom.inputPanel.getElementsByClassName("loading")[0].style.display = "none"
            PG.dom.inputPanel.getElementsByClassName("button")[0].style.display = ""

            PG.switchPanel(PG.dom.inputPanel)
        })

        PG.router.add("report/(:any)", function(apiKey) {
            PG.dom.inputPanel.getElementsByClassName("button")[0].style.display = "none"
            PG.dom.inputPanel.getElementsByClassName("loading")[0].style.display = ""

            PG.getReport(apiKey)
        })

        PG.router.add("apikey-help", function() {
            PG.dom.apikeyHelpPanel.getElementsByClassName("screenshot")[0].src = "/images/apikey.png"
            PG.switchPanel(PG.dom.apikeyHelpPanel)
        })

        PG.router.add("about", function() {
            PG.switchPanel(PG.dom.aboutPanel)
        })

        PG.router.addUriListener()
        PG.router.check()
    }

    // Bind events to inputs and
    static setEvents = () => {
        PG.dom.butGetReport.onclick = function() {
            if (PG.dom.txtApiKey.value && PG.dom.txtApiKey.value.length > 3) {
                PG.router.navigateTo(`report/${PG.dom.txtApiKey.value}`)
            } else {
                PG.dom.txtApiKey.focus()
            }
        }
        PG.dom.txtApiKey.addEventListener("keyup", function(event) {
            if (event.keyCode === 13) {
                event.preventDefault()
                PG.dom.butGetReport.click()
            }
        })
    }

    // DOM MANIPULATION
    // --------------------------------------------------------------------------

    // All dom elements that will be cached as variables.
    static dom = {
        inputPanel: null,
        txtApiKey: null,
        butGetReport: null,
        icoGetReport: null,

        reportPanel: null,
        reportRows: null,
        tableProfit: null,

        paypalPanel: null,

        apikeyHelpPanel: null,
        aboutPanel: null,

        errorPanel: null
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

        for (let value of tdValues) {
            if (!value) value = "0"

            let classInfo = isNaN(value) ? "" : ` class="has-text-right"`
            td.push(`<td${classInfo}>${value}</td>`)
        }

        tr.innerHTML = td.join("")

        return tr
    }

    // BUSINESS LOGIC AND ACTIONS
    // --------------------------------------------------------------------------

    // Fetch report from server.
    static getReport = async (apiKey) => {
        const url = `/api/report?key=${encodeURIComponent(apiKey)}`
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
                PG.showError(res.status, "Could not fetch data from Bitpanda")
            }
        } catch (ex) {
            PG.showError(ex, "Error generating report")
        }
    }

    // Process the report.
    static processReport = async (report) => {
        PG.dom.reportRows.innerHTML = ""

        for (let wallet of report.wallets) {
            const sellProfit = wallet.sellProfit ? wallet.sellProfit.toFixed(2) : 0
            const tr = PG.createTableRow(wallet.symbol, wallet.buy.length, wallet.totalBuy, wallet.sell.length, wallet.totalSell, sellProfit)
            PG.dom.reportRows.append(tr)
        }

        if (report.profit >= 0) {
            PG.dom.tableProfit.className = "is-profit"
            PG.dom.tableProfit.innerText = `Profit: ${report.profit.toFixed(2)}`
        } else {
            PG.dom.tableProfit.className = "is-loss"
            PG.dom.tableProfit.innerText = `Loss: ${report.profit.toFixed(2)}`
        }

        PG.switchPanel(PG.dom.reportPanel)
    }

    // Oops, something went wrong...
    static showError = (code, title) => {
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
}

// Init after document has loaded.
document.addEventListener("DOMContentLoaded", PG.init, false)