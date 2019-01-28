window.onload = async () => {
  let arr = window.location.pathname.split("/");
  let id = arr.pop();
  const response = await fetch("/recommendation/" + id, {
    method: "POST"
  });
  const recommends = await response.json();
  console.log(recommends);

  let row = document.getElementById("row");

  for (let e of recommends) {
    const movieResponse = await fetch("/movie/" + e[1]);
    const movie = await movieResponse.json();
    row.innerHTML =
      row.innerHTML +
      '<div class="card my-3 mx-auto" style="width: 200px; display: block"><div class="card-header"><strong>' +
      movie[0].title +
      '</strong></div><div class="card-body p-0"><img src="' +
      movie[0].imdbPictureURL +
      '" alt="' +
      movie[0].title +
      '" width=200></div><div class="card-footer">' +
      movie[0].year +
      "</div></div><br><br>";
  }
};
