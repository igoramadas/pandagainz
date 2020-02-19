class PandaGainz {
    static init = async () => {
        //paypal.Buttons().render("#paypal-button-container")
    }

    static getReport = async (apiKey) => {
        const url = `report?key=${encodeURIComponent(apiKey)}`
        const options = {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        }

        try {
            const response = await fetch(url, options)
            return await response.json()
        } catch (ex) {
            console.error(ex)
        }
    }

    static processReport = async (report) => {
        console.dir(report)
    }
}

document.addEventListener("DOMContentLoaded", PandaGainz.init, false)
