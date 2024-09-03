const readline = require("readline");
const https = require("https");

// Function to fetch HTML from URL
function GetHTMLFromURL(URL)
{
    https.get(URL, (response) => {

        let HTML = "";
        response.on("data", (DataChunk) => {HTML += DataChunk});
        response.on("end", () => {console.log(HTML)});

    }).on("error", () => {return null});
}

function ExtractInformationFromHTML(RawHTML)
{
    null;
}

async function ProcessPages(URLs)
{
    // Loop over each page

    for (let i = 0; i < URLs.length; i++)
    {
        const HTML = GetHTMLFromURL(URLs[i]);

        if (HTML)
        {
            const Information = ExtractInformationFromHTML(HTML);
        }
        
        else
        {
            console.log("Error extracting HTML.");
        }
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Get email from user and process the sites home page
rl.question("Email >>> ", (Input) => {

    const CompanyDomain = Input.split("@")[1];
    ProcessPages([`https://www.${CompanyDomain}`]);
    rl.close();

});
