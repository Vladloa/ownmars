export function claimTweet(plotName: string) {
  return `Just claimed ${plotName} on Mars 🚀 Try to take it from me → ownmars.lol #OwnMars`;
}

export function outbidTweet() {
  return `Someone just stole my Mars territory 🔴 I'm taking it back → ownmars.lol #OwnMars`;
}

export function tweetIntentUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
