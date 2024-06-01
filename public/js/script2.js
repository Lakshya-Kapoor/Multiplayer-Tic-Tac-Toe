let joinBtn = document.querySelector(".join-btn");

joinBtn.addEventListener("click", () => {
  let inputElement = document.querySelector("input");
  console.log(inputElement.value);
  window.location.href = `http://localhost:8080/room/${inputElement.value}`;
});
