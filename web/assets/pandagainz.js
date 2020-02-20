// PandaGainz JS

class PandaGainz {
    static txtApiKey = null
    static butGetReport = null

    // Document has loaded, init the usual stuff.
    static init = async () => {
        //paypal.Buttons().render("#paypal-button-container")

        PandaGainz.txtApiKey = document.getElementById("txt-api-key")
        PandaGainz.butGetReport = document.getElementById("but-get-report")
        PandaGainz.butGetReport.onclick = PandaGainz.getReport
    }

    // Fetch report from server.
    static getReport = async () => {
        const apiKey = PandaGainz.txtApiKey.value
        const url = `report/json?key=${encodeURIComponent(apiKey)}`
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

            if (res.status != 200) {
                throw new Error(report.error || "Invalid response from server")
            }

            PandaGainz.processReport(report)
        } catch (ex) {
            console.error(ex)
        }
    }

    // Process the report.
    static processReport = async (report) => {
        console.dir(report)
    }
}

// Init after document has loaded.
document.addEventListener("DOMContentLoaded", PandaGainz.init, false)
