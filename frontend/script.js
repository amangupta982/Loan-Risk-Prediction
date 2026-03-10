lucide.createIcons();


/* COUNTER ANIMATION */

const counters = document.querySelectorAll(".counter");

counters.forEach(counter => {

let target = +counter.dataset.target;
let count = 0;

let update = () => {

count += target / 60;

if(count < target){
counter.innerText = Math.floor(count) + "%";
requestAnimationFrame(update);
}
else{
counter.innerText = target + "%";
}

}

update();

});


/* SCROLL REVEAL */

const observer = new IntersectionObserver(entries => {

entries.forEach(entry => {

if(entry.isIntersecting){
entry.target.style.opacity = 1;
entry.target.style.transform = "translateY(0)";
}

});

});

document.querySelectorAll(".feature-card, .step").forEach(el => {

el.style.opacity = 0;
el.style.transform = "translateY(40px)";
el.style.transition = "all 0.8s ease";

observer.observe(el);

});


/* MOBILE MENU */

const toggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

toggle.addEventListener("click", () => {

navLinks.style.display =
navLinks.style.display === "flex" ? "none" : "flex";

});