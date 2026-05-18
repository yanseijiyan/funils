<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health - Alzheimer's Update</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <header class="main-header">
        <div class="header-left">
            <div class="hamburger">
                <span></span><span></span><span></span>
            </div>
            <div class="logo">
                <span class="sub-brand">Health</span>
            </div>
        </div>
        <button class="subscribe-btn">Subscribe</button>
    </header>

    <main class="article-container">
        <section class="meta-info">
            <p class="category">HEALTH <span>• 3 MIN READ</span></p>
            <h1 class="article-title">You Want a Proof you can reverse Alzheimer's?</h1>
            
            <div class="author-info">
                <p class="date" id="dynamic-date">CARREGANDO...</p>
                <p class="author">By Michal Ruprecht</p>
            </div>
        </section>

        <vturb-smartplayer id="vid-6979fff4fd79f656a5f1cc2a" style="display: block; margin: 0 auto; width: 100%; max-width: 400px;"></vturb-smartplayer> <script type="text/javascript"> var s=document.createElement("script"); s.src="https://scripts.converteai.net/de0e2730-2609-4c1f-afcb-33a0e3924a03/players/6979fff4fd79f656a5f1cc2a/v4/player.js", s.async=!0,document.head.appendChild(s); </script>

        <div class="social-share">
            <button class="social-btn">✉</button>
            <button class="social-btn">🔗</button>
            <button class="social-btn">𝕏</button>
            <button class="social-btn">f</button>
        </div>

        <article class="content">
            <p>In the video above, <strong>Dr. Attia</strong> explains the main aspects of a recent research development that has surprised parts of the scientific community and sparked renewed debate.</p>
            <p>The findings have prompted further discussion <strong>among researchers and professionals</strong> raising new questions and perspectives on a topic that has long been considered settled.</p>
        </article>

        <div class="social-share bottom-share">
            <button class="social-btn">✉</button>
            <button class="social-btn">🔗</button>
            <button class="social-btn">𝕏</button>
            <button class="social-btn">f</button>
        </div>
    </main>

    <script>
        function setDynamicDate() {
            const dateElement = document.getElementById('dynamic-date');
            const now = new Date();
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            let formattedDate = now.toLocaleDateString('en-US', options);
            dateElement.textContent = formattedDate.toUpperCase();
        }
        setDynamicDate();
    </script>
    <script>!function(i,n){i._plt=i._plt||(n&&n.timeOrigin?n.timeOrigin+n.now():Date.now())}(window,performance);</script>
    <link rel="preload" href="https://scripts.converteai.net/de0e2730-2609-4c1f-afcb-33a0e3924a03/players/6979fff4fd79f656a5f1cc2a/v4/player.js" as="script">
    <link rel="preload" href="https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js" as="script">
    <link rel="preload" href="https://cdn.converteai.net/de0e2730-2609-4c1f-afcb-33a0e3924a03/6979ffbc12968485c788cc12/main.m3u8" as="fetch">
    <link rel="dns-prefetch" href="https://cdn.converteai.net">
    <link rel="dns-prefetch" href="https://scripts.converteai.net">
    <link rel="dns-prefetch" href="https://images.converteai.net">
    <link rel="dns-prefetch" href="https://api.vturb.com.br">
</body>
</html>

<style>
    /* 1. RESET GLOBAL */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    line-height: 1.5;
    color: #222;
    padding-top: 70px; /* Espaço para o header não cobrir o texto */
    background-color: #fff;
}

/* 2. HEADER FIXO */
.main-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    border-bottom: 1px solid #e2e2e2;
    position: fixed;
    top: 0;
    width: 100%;
    background: white;
    z-index: 1000;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 15px;
}

.hamburger {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 20px;
    height: 14px;
}

.hamburger span {
    display: block;
    width: 100%;
    height: 2px;
    background-color: #000;
    border-radius: 2px;
}

.sub-brand {
    font-size: 24px;
    color: #CC0000; /* Vermelho Health */
    font-weight: 800;
    letter-spacing: -0.8px;
}

.subscribe-btn {
    background-color: #CC0000;
    color: white;
    border: none;
    padding: 8px 14px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 13px;
}

/* 3. META INFO E HEADLINE */
.article-container {
    padding: 15px 0;
}

.meta-info {
    padding: 0 20px;
}

.category {
    font-size: 11px;
    font-weight: 700;
    color: #444;
    margin-bottom: 10px;
    text-transform: uppercase;
}

.article-title {
    font-size: 28px;
    line-height: 1.05;
    font-weight: 800;
    margin-bottom: 15px;
    color: #000;
}

.author-info {
    font-size: 14px;
    margin-bottom: 25px;
}

.date {
    font-weight: 800;
    color: #000;
    margin-bottom: 2px;
}

.author {
    color: #555;
}

/* 4. IMAGEM E REDES SOCIAIS */
.main-image img {
    width: 100%;
    display: block;
}

.main-image figcaption {
    padding: 10px 20px;
    font-size: 14px;
    color: #666;
    border-bottom: 1px solid #f0f0f0;
}

.social-share {
    display: flex;
    gap: 12px;
    padding: 15px 20px;
}

.social-btn {
    width: 40px;
    height: 40px;
    background-color: #fff;
    border: 1px solid #dcdcdc;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
    color: #444;
    cursor: pointer;
}

.bottom-share {
    margin-top: 20px;
    border-top: 1px solid #f0f0f0;
    padding-bottom: 40px;
}

/* 5. CONTEÚDO DO ARTIGO */
.content {
    padding: 20px;
    font-family: "Georgia", serif;
    font-size: 20px;
    line-height: 1.6;
}

.content p {
    margin-bottom: 25px;
}

.content strong {
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 2px;
}
</style>