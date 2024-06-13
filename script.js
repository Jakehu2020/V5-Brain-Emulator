let code = "", running = false;

document.querySelector("#upload").addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            code = JSON.parse(e.target.result).workspace;
        };
        reader.readAsText(file);
    } else {
        alert("No file selected");
    }
});
document.querySelector(".run").addEventListener("click", run);

async function run() {
    running = false;
    await timer_f(50);
    running = true;
    cursor = [1, 1];
    pen_width = 10;
    pen_color = "green";
    pen_font = "20px Roboto Mono, monospace";
    time = performance.now();
    local_data = {};
    let p = document.querySelector(".html");
    await new Promise(res => {
        p.innerHTML = code;
        p = p.children[0];
        res();
    });

    Array.from(p.children[0]).forEach(async variable => {
        local_data[variable.innerText] = 0;
    });

    function_list["v5_looks_clear_all_rows"]();

    Array.from(p.children).slice(1).forEach(async x => {
        window.running = true;
        let y = x;
        if(function_list[y.getAttribute("type")](y)){
            return;
        }
        while (y.lastChild.nodeName == "NEXT" && running == true) {
            y = y.lastChild.children[0];
            if (!is_brain(y)) { continue; }
            console.log(y);
            await function_list[y.getAttribute("type")](y);
        }
    });
}