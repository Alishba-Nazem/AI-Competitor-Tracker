# Reflection

## What was hardest?

Keeping the product honest. Scraping Shopify and Daraz for a *current selling price* is messy: installment copy, list vs sale price, and pages that only expose JSON-LD. Inventing a price would have made the dashboard look finished and the product useless. The same constraint applied to reviews and to the Claude briefing — the model is only allowed to rewrite facts we already stored.

Per-user workspaces were the other hard cut. The first version stored one global profile, so two accounts saw the same competitors. Wiring `userId` through onboarding, lists, and capture routes was less glamorous than the UI, but without it the live demo is not a real product.

## What I would do differently

I would add the LLM last, on a thin fact pack, which is what we ended up with — but I would have designed that fact pack on day one. I also would have isolated data by user before the first onboarding demo, so we did not have to explain why a second account inherited someone else’s catalog.

## What surprised me

“AI features” are easy to fake with keyword lists. Those lists are useful as a fallback, but they are not what a reviewer (or a seller) means by AI. The surprising part was how small the Claude surface could be and still be useful: six bullets from captured diffs beat a chatbot that does not know the store’s prices.
