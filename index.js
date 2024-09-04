const ReadLine = require("readline");
const https = require("https");
const Cheerio = require("cheerio");
const Knwl = require("knwl.js");

let Emails = [];
let PhoneNumbers = [];
let Addresses = [];
let ExploredPages = [];

function Delay(MilliSeconds)
{
    return new Promise(Resolve => setTimeout(Resolve, MilliSeconds));
}

// Add item to an array while avoiding duplicates
function AppendToArray(Item, Array)
{
    if (!Array.includes(Item)) { Array.push(Item); }
}

// Function to fetch raw HTML as string from URL
function GetHTMLFromURL(URL)
{
    const Header = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    return new Promise((Resolve, Reject) => {
        https.get(URL, Header, (Response) => {

            // Check if content grabbed is HTML
            if (!Response.headers['content-type'].includes('text/html'))
            {
                Resolve(null);
                return;
            }

            let HTML = "";
            Response.on("data", (DataChunk) => { HTML += DataChunk; });
            Response.on("end", () => { Resolve(HTML); });

        }).on("error", (Error) => { Reject(Error); });
    });
}

function ExtractInformationFromHTML(HTML)
{
    // Extract emails, phone numbers and addresses using Knwl.js
    const KnwlInstance = new Knwl("english");
    KnwlInstance.init(HTML);

    const ExtractedEmails = KnwlInstance.get("emails");
    ExtractedEmails.forEach((Email) => {
        if (Email.address.toLowerCase().split("@")[1].split(".")[0] === CompanyDomain.split(".")[0])
        { AppendToArray(Email.address, Emails); }
    });

    const ExtractedPhones = KnwlInstance.get("phones");
    ExtractedPhones.forEach((Number) => {
        AppendToArray(Number.phone, PhoneNumbers);
    });

    const ExtractedAddresses = KnwlInstance.get("places");
    ExtractedAddresses.forEach((Address) => {
        AppendToArray(Address.place, Addresses);
    });
}

function ExtractInteralLinkFromHtml(HTML, BaseURL)
{
    // Extract internal links to further traverse the site
    const $ = Cheerio.load(HTML);
    const URLs = [];

    $("a").each((Index, Element) => {

        let NewURL = $(Element).attr("href");

        if (NewURL)
        {
            if (NewURL.startsWith("/"))
            {
                // Convert relative URL to absolute URL
                NewURL = new URL(NewURL, BaseURL).href;
                URLs.push(NewURL);
            }

            else if (NewURL.startsWith(BaseURL.split("/").slice(0, 3).join("/")))
            {
                URLs.push(NewURL);
            }
        }
    });

    return URLs;
}

async function ProcessPages(URLs, Depth)
{
    for (let i = 0; i < URLs.length; i++)
    {
        // Make sure you havent already processed this page
        if (!ExploredPages.includes(URLs[i]))
        {
            AppendToArray(URLs[i], ExploredPages);

            // Throttle requests with a delay (0.5 - 1.5 secs) to avoid being blocked
            Delay(Math.floor(Math.random() * 100 + 50));

            try
            {
                const HTML = await GetHTMLFromURL(URLs[i]);

                if (HTML)
                {
                    ExtractInformationFromHTML(HTML);

                    // Process other pages on the site while limiting how deep it can explore
                    if (Depth < 50)
                    {
                        const NewURLs = ExtractInteralLinkFromHtml(HTML, URLs[i]);
                        await ProcessPages(NewURLs, Depth + 1);
                    }
                }
            }

            catch (Error) {
                console.error("Error processing URL: ", Error);
            }
        }
    }
}

function LogResults()
{
    console.log("\nEmails:", Emails);
    console.log("\nPhone Numbers:", PhoneNumbers);
    console.log("\nAddresses:", Addresses);
    console.log("\nExplored Pages:", ExploredPages);
}

const ReadLineInterface = ReadLine.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Get email from user and process the sites home page
ReadLineInterface.question("Email >>> ", async (Input) => {

    CompanyDomain = Input.split("@")[1].toLowerCase();
    await ProcessPages([`https://www.${CompanyDomain}`], 0);
    LogResults();
    ReadLineInterface.close();

});
