import { 
    ACTIONS_CORS_HEADERS, 
    ActionGetResponse, 
    ActionPostRequest, 
    ActionPostResponse, 
    createPostResponse 
} from "@solana/actions";
import { 
    Connection, 
    LAMPORTS_PER_SOL, 
    PublicKey, 
    SystemProgram, 
    Transaction, 
    clusterApiUrl 
} from "@solana/web3.js";


export const GET = (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { toPubkey } = validatedQueryParams(requestUrl);

        const baseHref = new URL(
            `/api/actions/transfer-sol?to=${toPubkey.toBase58()}`,
            requestUrl.origin,
        ).toString();

        const payload: ActionGetResponse = {
            title: "Transfer Native SOL",
            icon: new URL("/solana_devs.jpg", requestUrl.origin).toString(),
            description: "Transfer SOL from one Wallet to another",
            label: "Transfer",
            links: {
                actions: [
                    {
                        label: "Send 1 SOL",
                        href: `${baseHref}&amount=${"1"}`,
                    },
                    {
                        label: "Send 5 SOL",
                        href: `${baseHref}&amount=${"5"}`,
                    },
                    {
                        label: "Send 10 SOL",
                        href: `${baseHref}&amount=${"10"}`
                    },
                    {
                        label: "Send SOL",
                        href: `${baseHref}&amount={amount}`,
                        parameters: [
                            {
                                name: "amount",
                                label: "Enter the amount of SOL to send",
                                required: true
                            },
                        ],
                    },
                ],
            },    
        };

        return Response.json(payload, {
            headers: ACTIONS_CORS_HEADERS,
        });

    } catch (error) {
        let message = "An unknown error occured.";
        if (typeof error == "string") message = error;
        return new Response(message, {
            status: 400,
            headers:  ACTIONS_CORS_HEADERS,
        });
    }
};


export const OPTIONS = GET;


export const POST = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { amount, toPubkey } = validatedQueryParams(requestUrl);

        const body: ActionPostRequest = await req.json();

        let account: PublicKey;

        try {
            account = new PublicKey(body.account)
        } catch (error) {
            return new Response('Invalid "account" provided', {
                status: 400,
                headers: ACTIONS_CORS_HEADERS
            });
        }

        const connection = new Connection(
            process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
        );

        const minimumBalance = await connection.getMinimumBalanceForRentExemption(
            0,
        );

        if (amount * LAMPORTS_PER_SOL < minimumBalance) {
            throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
        }

        const transaction = new Transaction();

        transaction.add(
            SystemProgram.transfer({
                fromPubkey: account,
                toPubkey: toPubkey,
                lamports: amount * LAMPORTS_PER_SOL,
            }),
        );

        transaction.feePayer = account;

        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;

        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                transaction,
                message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
            },
        });

        return Response.json(payload, {
            headers: ACTIONS_CORS_HEADERS
        })
    } catch (error) {
        let message = "An unknown error occurred";
        if (typeof error == "string") message = error;
        return new Response(message, {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
    });
    }
}


function validatedQueryParams(requestUrl: URL) {
    let toPubkey: PublicKey = DEFAULT_SOL_ADDRESS;
    let amount: number = DEFAULT_SOL_AMOUNT;

    try {
        if (requestUrl.searchParams.get("to")) {
            toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
        } 
    } catch (error) {
        throw "Invalid input query parameter: to";
    }

    try {
        if (requestUrl.searchParams.get("amount")) {
            amount = parseFloat(requestUrl.searchParams.get("amount")!);
        }

        if (amount < 0)
            throw "Amount is too small";
    } catch (error) {
        throw "Invalid input query parameter: amount"
    }

    return {
        amount,
        toPubkey
    };
}


export const DEFAULT_SOL_ADDRESS: PublicKey = new PublicKey(
  "nick6zJc6HpW3kfBm4xS2dmbuVRyb5F3AnUvj5ymzR5", // devnet wallet
);

export const DEFAULT_SOL_AMOUNT: number = 1.0;