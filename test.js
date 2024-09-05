const https = require("https");
const http = require("http");

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

GetURL("kokorouk.com").then(finalUrl => { console.log(`Final URL: ${finalUrl}`); });
