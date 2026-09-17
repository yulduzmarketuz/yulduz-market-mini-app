export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/test") {
      return new Response("YULDUZ WORKER ISHLAYAPTI");
    }

    return new Response("OK");
  }
};
