var select = document.getElementById("select_user");
var content = document.getElementById("content");
var recommendations = document.getElementById("recommendations");

select.onchange = async () => {
  const response = await fetch("/user/" + select.value);
  const ratings = await response.json();

  const rec_response = await fetch("/recommendation/" + select.value, {
    method: "POST"
  });
  const recommends = await rec_response.json();

  console.log(recommendations);

  content.innerHTML = "";
  for (let e of ratings) {
    let image = document.createElement("img");
    if (e.imdbPictureURL.startsWith("http:")) {
      e.imdbPictureURL =
        "https" + e.imdbPictureURL.substring(4, e.imdbPictureURL.length);
    }
    image.src = e.imdbPictureURL;
    image.height = 150;
    image.alt = e.title;

    let card = document.createElement("div");
    card.className = "card border-primary mb-3";

    let cardHeader = document.createElement("div");
    cardHeader.className = "card-header";
    cardHeader.innerText = e.title;

    let cardBody = document.createElement("div");
    cardBody.className = "card-body text-center";
    cardBody.appendChild(image);

    let date = new Date(e.timestamp);
    let cardFooter = document.createElement("div");
    cardFooter.className = "card-footer";
    cardFooter.innerText =
      "Rating: " + e.rating * 2 + "\n" + date.toLocaleString();

    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    card.appendChild(cardFooter);
    content.appendChild(card);
  }

  recommendations.innerHTML = "";
  for (let e of recommends) {
    const mov_res = await fetch("/movie/" + e[1]);
    const movie = await mov_res.json();

    let image = document.createElement("img");
    if (movie[0].imdbPictureURL.startsWith("http:")) {
      movie[0].imdbPictureURL =
        "https" +
        movie[0].imdbPictureURL.substring(4, movie[0].imdbPictureURL.length);
    }
    image.src = movie[0].imdbPictureURL;
    image.height = 150;
    image.alt = movie[0].title;

    let card = document.createElement("div");
    card.className = "card border-primary mb-3";

    let cardHeader = document.createElement("div");
    cardHeader.className = "card-header";
    cardHeader.innerText = movie[0].title;

    let cardBody = document.createElement("div");
    cardBody.className = "card-body text-center";
    cardBody.appendChild(image);

    let cardFooter = document.createElement("div");
    cardFooter.className = "card-footer";
    cardFooter.innerText = movie[0].year;

    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    card.appendChild(cardFooter);
    recommendations.appendChild(card);
  }
};
