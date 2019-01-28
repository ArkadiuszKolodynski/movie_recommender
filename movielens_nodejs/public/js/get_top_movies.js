Array.prototype.shuffle = function() {
  let m = this.length,
    i;
  while (m) {
    i = (Math.random() * m--) >>> 0;
    [this[m], this[i]] = [this[i], this[m]];
  }
  return this;
};

let i = 0;
let data = [];
let currentId = 0;

window.onload = async () => {
  const responseId = await fetch("/lastid");
  const lastid = await responseId.json();
  const responseMovies = await fetch("/get100");
  const movies = await responseMovies.json();
  currentId = lastid[0].user_id + 1;
  movies.shuffle();
  console.log(movies);
  let img = document.getElementById("img");
  let title = document.getElementById("title");
  let year = document.getElementById("year");

  document.getElementById("confirm").onclick = () => {
    confirmRate(img, title, year, movies, currentId);
  };

  document.getElementById("skip").onclick = () => {
    i++;
    setMovie(img, title, year, movies);
  };

  setMovie(img, title, year, movies);
};

setMovie = (img, title, year, movies) => {
  img.src = movies[i].imdbPictureURL;
  img.alt = movies[i].title;
  title.innerText = movies[i].title;
  year.innerText = movies[i].year;
};

confirmRate = (img, title, year, movies, currentId) => {
  let select = document.getElementById("rate");
  let counter = document.getElementById("counter");
  counter.innerText++;
  data.push({
    user_id: currentId,
    movie_id: movies[i].id,
    rating: parseInt(select.value) / 2,
    timestamp: Date.now()
  });
  i++;
  if (data.length < 10) {
    setMovie(img, title, year, movies);
  } else {
    document.getElementById("row").innerHTML =
      '<div class="mt-5"><div class="loader">Loading...</div></div>';
    fetch("/add-rates", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then(res => res.json())
      .then(response => {
        console.log("Success:", JSON.stringify(response));
        setTimeout(() => {
          window.location.replace(
            window.location.origin + "/user-recommendation/" + currentId
          );
        }, 3000);
      })
      .catch(error => console.error("Error:", error));
  }
  console.log(data);
};
