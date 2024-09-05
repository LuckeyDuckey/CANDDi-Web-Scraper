const ReadLine = require("readline");
const Cheerio = require("cheerio");
const Knwl = require("knwl.js");

const https = require("https");
const http = require("http");

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
    const Protocol = URL.startsWith("https") ? https : http;

    const Header = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    return new Promise((Resolve, Reject) => {
        Protocol.get(URL, Header, (Response) => {

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

// Custom UK phone number filtering function
function ExtractPhoneNumbers(HTML)
{
    const PhoneRegex = /(?<!\d)(0|\+44|44)[\s\-()]*(\d[\s\-()]*){10}(?!\d)/g;
    const Matches = HTML.match(PhoneRegex);

    /*
    Explanation for PhoneRegex:
    -> "(?<!\d)": Ensures the match is not preceded by a digit
    -> "(0|\+44|44)?": Matches the UK dialing code (0, +44, or 44)
    -> "[\s\-()]*": Matches any number of spaces, hyphens, or parentheses
    -> "(\d[\s\-()]*){10}": Matches exactly 10 digits, allowing for optional separators
    -> "(?!\d)": Ensures the match is not followed by additional digits
    -> "g": Global flag to match all occurrences in the input string
    */

    let PhoneNumbers = [];

    // Format numbers like so "+44 xxxx xxxxxx" and "0xxxx xxxxxx"
    if (Matches && Array.isArray(Matches))
    {
        Matches.forEach((Match) => {
            let CleanNumber = Match.replace(/[\s\-\(\)\+]/g, "");
            let SpaceIndex = CleanNumber.length - 5;

            if (CleanNumber.startsWith("44"))
            {
                PhoneNumbers.push(`+${CleanNumber.slice(0, 2)} ${CleanNumber.slice(2, SpaceIndex)} ${CleanNumber.slice(SpaceIndex)}`);
            } else
            {
                PhoneNumbers.push(`+44 ${CleanNumber.slice(1, SpaceIndex)} ${CleanNumber.slice(SpaceIndex)}`);
            }
        });
    }

    return PhoneNumbers;
}

// Custom UK addresses filtering function
function ExtractAddresses(HTML)
{
    // Get rid of all html tags
    const HTMLClean = HTML.replace(/<[^>]*>/g, ' ');

    // I will not be explaining this regex it was a nightmare to come up much less explain :)
    const AddressRegex = /(?<![\w\-])\d{1,4}[.\s\-]([\w\-]+){1,2}[.\s\-](?:Acre|Alley|Approach|Arcade|Arch|Avenue|Bank|Boulevard|Bow|Bridge|Broadway|Brook|Brow|Bypass|Chase|Circus|Close|Court|Corner|Crescent|Cross|Croft|Dale|Dene|Drive|Drove|End|Field|Fold|Gardens|Gate|Ginnel|Grange|Green|Grove|Heights|Hill|Lane|Lea|Leasow|Leasowe|Market|Mead|Meadow|Mews|Mile|Mount|Nook|Parade|Pasture|Pass|Passage|Path|Park|Place|Plaza|Reach|Rise|Road|Row|Score|Side|Street|Square|Terrace|Twitten|Vale|Valley|View|Quay|Walk|Way|Yard|St|Rd|Ave|Ln|Dr|Cl|Cres|Ct|Sq|Pl|Ter|Wy)[,.\s\-]{1,3}([\w\-]+[,.\s\-]{1,3}){1,3}?[A-Z]{1,2}\d{1,2}[A-Z]?[.\s\-]?\d[A-Z]{2}(?![\w\-])/gi;

    const Addresses = HTMLClean.match(AddressRegex);

    return Addresses ? Addresses: [];
}

function ExtractInformationFromHTML(HTML)
{
    // Extract emails, phone numbers and addresses using Knwl.js
    const KnwlInstance = new Knwl("english");
    KnwlInstance.init(HTML);

    const ExtractedEmails = KnwlInstance.get("emails");
    ExtractedEmails.forEach((Email) => {
        if (Email.address.toLowerCase().includes(CompanyDomain.split(".")[0]))
        { AppendToArray(Email.address, Emails); }
    });

    const ExtractedPhones = ExtractPhoneNumbers(HTML);
    ExtractedPhones.forEach((Number) => {
        AppendToArray(Number, PhoneNumbers);
    });

    const ExtractedAddresses = ExtractAddresses(HTML);
    ExtractedAddresses.forEach((Address) => {
        AppendToArray(Address, Addresses);
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

            // Show progress through site
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(`Processed *${ExploredPages.length}* Pages`);

            // Throttle requests with a delay to avoid being blocked
            // await Delay(Math.floor(Math.random() * 100 + 50));

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

// Function to handle redirects and find the proper website URL
function GetURL(URL, RedirectCount = 0)
{
    return new Promise((Resolve, Reject) => {

        // Limit the number of redirects to avoid infinite loops
        if (RedirectCount > 5) {
            console.log('Too many redirects');
            return Resolve(null);
        }

        const Protocol = URL.startsWith("https") ? https : http;

        const Headers = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        Protocol.get(URL, Headers, (Response) => {

            // If we get a 3xx response follow the redirect
            if (Response.statusCode >= 300 && Response.statusCode < 400 && Response.headers.location)
            {
                const RedirectUrl = Response.headers.location;
                Resolve(GetURL(RedirectUrl, RedirectCount + 1));
            }

            // If successful return the final URL
            else if (Response.statusCode >= 200 && Response.statusCode < 300)
            {
                Resolve(URL);
            }

            // If status code not in range 200 - 300 consider it an error
            else
            {
                console.error(`Failed to fetch page. Status code: ${Response.statusCode}`);
                Resolve(null);
            }

        }).on('error', (error) => {
            console.error(`Problem with request: ${error.message}`);
            Resolve(null);
        });
    });
}

function LogResults()
{
    process.stdout.clearLine(0);

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
ReadLineInterface.question("Email >>> ", (Input) => {

    CompanyDomain = Input.split("@")[1].toLowerCase();

    GetURL(`https://www.${CompanyDomain}`).then(async FinalURL => {
        if (FinalURL)
        {
            await ProcessPages([FinalURL], 0);
            LogResults();
            process.exit(0);
        }
    })

    ReadLineInterface.close();

});
