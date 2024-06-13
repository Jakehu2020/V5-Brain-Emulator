const canvas = document.querySelector(".c");
const ctx = canvas.getContext("2d");
ctx.fillStyle='white';
ctx.strokeStyle='white';

let cursor = [1, 1];
let pen_width = 10;
let pen_color = "white";
let pen_font = "20px Roboto Mono, monospace";
let timer = 0;
let local_data = {};
let functions = {};

ctx.lineWidth = pen_width/5;

let locals = {
    mousedown: false,
    keyspressed: [],
    mousex: 0,
    mousey: 0
}

canvas.addEventListener("mousedown", (e) => {
    locals.mousedown = true;
});

canvas.addEventListener("mouseup", (e) => {
    locals.mousedown = true;
});
window.addEventListener("keydown", (e) => {
    locals.keyspressed.push(e.key);
});
window.addEventListener("keyup", (e) => {
    locals.keyspressed.splice(locals.keyspressed.indexOf(e.key),1);
});
canvas.addEventListener("mousemove", (e) => {
    locals.mousex = e.clientX;
    locals.mousey = e.clientY;
});

const timer_f = ms => new Promise(res => setTimeout(res, ms));
function is_brain(y){
    let n = true;
    y.querySelectorAll("field").forEach(x => {
        if(x.name == "TARGET" && x.innerText != "Brain"){ n = false }
    });
    return n;
}
function getVal(n){
    let res = n.children[0].lastChild;
    if(res.nodeName == "FIELD" && typeof res.getAttribute("name") == "NUM"){ return Number(n.children[0].children[0].innerText); }
    if(typeof res == ''){}
}
function run_block(y){
    if(y.nodeName == "BLOCK"){
        return function_list[y.getAttribute("type")(y)];
    } else {
        return false;
    }
}
function calcBlock(i){
    try{
        return function_list[i.getAttribute("type")](i);
    } catch(e) { console.log(i) }
}
function calcValue(i){
    return calcBlock(i.lastChild);
}
function getComposition(y) {
    let composition = {};
    let children = Array.from(y.children);
    children.forEach(child => {
        if(child.nodeName == "NEXT"){ return; }
        let obj = {
            name: child.getAttribute("name"),
            type: child.nodeName,
            value: child.nodeName=="VALUE"?calcValue(child):(child.nodeName=="STATEMENT"?Array.from(child.children):(child.nodeName=="FIELD"?child.innerText:child)),
            element: child,
            reval: () =>{ obj.value = child.nodeName=="VALUE"?calcValue(child):(child.nodeName=="STATEMENT"?Array.from(child.children):(child.nodeName=="FIELD"?child.innerText:child)); return obj.value }
        }
        composition[child.getAttribute("name") || child.nodeName] = obj;
    });
    return composition;
}
const function_list = {
    "v5_looks_set_cursor": (y) => {
        let comp = getComposition(y);
        cursor = [comp.ROW.value,comp.COLUMN.value];
    },
    "v5_looks_set_font": (y) => {
        let comp = getComposition(y);
        pen_font = comp.FONT.value
        ctx.font = pen_font;
    },
    "v5_looks_set_width": (y) => {
        let comp = getComposition(y);
        pen_width = comp.WIDTH.value;
        ctx.lineWidth = pen_width/5;
    },
    "v5_looks_set_pen_color": (y) => {
        let comp = getComposition(y);
        pen_color = comp.COLOR.value;
        ctx.fillStyle = ctx.strokeStyle = pen_color;
    },
    "v5_looks_print": (y) => {
        let comp = getComposition(y);
        let text = String(comp.DATA.value);
        ctx.font = pen_font;
        ctx.fillStyle = pen_color;
        for (const i of text.split('')) {
            ctx.fillText(i, cursor[0], cursor[1] + 9);
            cursor[0] += 10;
        }
        if (comp.andsetcursortonextrow_mutator.value) {
            cursor = [1, cursor[1] + 10];
        }
    },
    "v5_looks_next_row": (y) => {
        cursor = [1, cursor[1] + 10];
    },
    "v5_looks_set_print_precision": (y) => {
        let comp = getComposition(y);
        comp.PRECISION.value;
        // What in the world does this do..?
    },
    "v5_looks_clear_all_rows": (y) => {
        ctx.clearRect(0, 0, 999, 999)
    },
    "v5_looks_clear_row": (y) => {
        let comp = getComposition(y);
        ctx.clearRect(1, (22 + 2 / 3) * comp.ROW.value);
    },
    "v5_looks_draw_pixel": (y) => {
        let comp = getComposition(y);
        ctx.fillRect(comp.X.value, comp.Y.value, pen_width, pen_width)
    },
    "v5_looks_draw_line": (y) => {
        let comp = getComposition(y);
        ctx.beginPath();
        ctx.moveTo(comp.X1.value, comp.Y1.value);
        ctx.lineTo(comp.X2.value, comp.Y2.value);
        ctx.stroke(); 
    },
    "v5_looks_draw_rectangle": (y) => {
        let comp = getComposition(y);
        ctx.fillRect(comp.X.value,comp.Y.value,comp.WIDTH.value,comp.HEIGHT.value);
    },
    "v5_looks_draw_circle": (y) => {
        let comp = getComposition(y);
        ctx.beginPath();
        ctx.arc(comp.X.value, comp.Y.value, comp.RADIUS.value, 0, 2 * Math.PI);
        ctx.stroke();
    },
    "v5_variables_set_variable": (y) => {
        let comp = getComposition(y);
        local_data[comp.VARIABLE.value] = comp.VALUE.value;
    },
    "v5_variables_change_variable": (y) => {
        let comp = getComposition(y);
        local_data[comp.VARIABLE.value] = Number(comp.VALUE.value) + Number(local_data[comp.VARIABLE.value]);
    },
    "v5_control_repeat": async(y) => {
        let comp = getComposition(y);
        for (var n = 0; n < comp.TIMES.value; n++) {
            let i = comp.SUBSTACK.value[0];
            await function_list[i.getAttribute("type")](i);
            while (i.lastChild.nodeName == "NEXT" && running == true) {
                if (!is_brain(i)) { continue; }
                i = i.lastChild.children[0];
                await function_list[i.getAttribute("type")](i);
            }
        }
    },
    "v5_control_wait": async (y) => {
        let comp = getComposition(y);
        await timer_f(1000*comp.DURATION.value);
    },
    "v5_control_forever": async (y) => {
        let comp = getComposition(y);
        console.log(comp, running);
        while (running) {
            // console.log(running);
        // for(var n=0;n<Infinity;n++){
            let i = comp.SUBSTACK.value[0];
            await function_list[i.getAttribute("type")](i);
            while (i.lastChild.nodeName == "NEXT" && running == true) {
                if (!is_brain(i)) { continue; }
                i = i.lastChild.children[0];
                await function_list[i.getAttribute("type")](i);
            }
            // console.log(n);
            await timer_f(0.05);
        }
    },
    "v5_control_if_then": async(y) => {
        let comp = getComposition(y);
        if (comp.CONDITION.value) {
            for (const i of comp.SUBSTACK.value) {
                if (i.getAttribute("type" == "v5_control_break")) {
                    break;
                }
                await calcBlock(i);
            }
        }
    },
    "v5_control_if_then_else": async(y) => {
        let comp = getComposition(y);
        if (comp.CONDITION.value) {
            for (const i of comp.SUBSTACK.value) {
                if (i.getAttribute("type" == "v5_control_break")) {
                    break;
                }
                await calcBlock(i);
            }
        } else {
            for (const i of comp.SUBSTACK2.value) {
                if (i.getAttribute("type" == "v5_control_break")) {
                    break;
                }
                await calcBlock(i);
            }
        }
    },
    "v5_control_if_elseif_else": async(y) => {
        let comp = getComposition(y);
        let yes = false;
        for (var i = 0; i < comp.MUTATION.element.getAttribute("branches"); i += 2) {
            if (!yes && comp["CONDITION"+1+i/2].value) {
                yes = true
                for (const i of comp["SUBSTACK"+1+i/2].value) {
                    if (i.getAttribute("type" == "v5_control_break")) {
                        break;
                    }
                    await calcBlock(i);
                }
            }
        }
        if (!yes) {
            for (const i of comp.SUBSTACK_ELSE.value) {
                if (i.getAttribute("type" == "v5_control_break")) {
                    break;
                }
                await calcBlock(i);
            }
        }
    },
    "v5_control_wait_until": async (y) => {
        let comp = getComposition(y);
        const poll = resolve => {
            if (comp.CONDITION.reval()) resolve();
            else setTimeout(_ => poll(resolve), 400);
            // Precision is this?
        }

        return new Promise(poll);
    },
    "v5_control_repeat_until": async(y) => {
        let comp = getComposition(y);
        while (comp.CONDITION.reval()) {
            for (const i of comp.SUBSTACK.value) {
                if (i.getAttribute("type" == "v5_control_break")) {
                    break;
                }
                await calcBlock(i);
            }
        }
    },
    "v5_control_while": async(y) => {
        let comp = getComposition(y);
        while (comp.CONDITION.reval()) {
            for (const i of comp.SUBSTACK.value) {
                if (i.getAttribute("type" == "v5_control_break")) {
                    break;
                }
                await calcBlock(i);
            }
        }
    },
    "v5_control_stop_project": (y) => {
        running = false;
    },
    "v5_operator_and": (y) => {
        let comp = getComposition(y);
        return comp.OPERAND1.value && comp.OPERAND2.value;
    },
    "v5_operator_or": (y) => {
        let comp = getComposition(y);
        return comp.OPERAND1.value || comp.OPERAND2.value;
    },
    "v5_operator_greater_than": (y) => {
        let comp = getComposition(y);
        return comp.OPERAND1.value > comp.OPERAND2.value;
    },
    "v5_operator_less_than": (y) => {
        let comp = getComposition(y);
        return comp.OPERAND1.value < comp.OPERAND2.value;
    },
    "v5_operator_equal_to": (y) => {
        let comp = getComposition(y);
        return comp.OPERAND1.value == comp.OPERAND2.value;
    },
    "v5_operator_not": (y) => {
        let comp = getComposition(y);
        return !comp.OPERAND.value;
    },
    "v5_sensing_reset_timer": (y) => {
        timer = performance.now();
    },
    "v5_sensing_timer_value": (y) => {
        return (performance.now() - timer)/1000;
    },
    "v5_sensing_cursor_column": (y) => {
        return cursor[0];
    },
    "v5_sensing_cursor_row": (y) => {
        return cursor[1];
    },
    "v5_events_when_started": (y) => { / Nothing required, hah /},
    "v5_sensing_screen_pressed": (y) => {
        return locals.mousedown;
    },
    "v5_operator_function": (y) => {
        let comp = getComposition(y);
        if(comp.OPERATOR.value=="10^"){
            return 10**comp.NUM.value;
        }
        if(Math[comp.OPERATOR.value]){
            return Math[comp.OPERATOR.value](comp.NUM.value);
        } else {
            let swap = {"ceiling":"ceil","ln":"log","log":"log10","e^":"exp"};
            Math[swap[comp.OPERATOR.value]](getVal(comp.NUM.value));
        }
    },
    "v5_variables_variable": (y) => {
        let comp = getComposition(y);
        return local_data[comp.VARIABLE.value] || 0;
    },
    "v5_operator_random": (y) => {
        let comp = getComposition(y);
        return Math.floor(Math.random()*(comp.TO.value-comp.FROM.value+1)) + comp.FROM.value;
    },
    "v5_operator_round": (y) => {
        let comp = getComposition(y);
        return Math.round(comp.NUM.value);
    },
    "v5_operator_remainder": (y) => {
        let comp = getComposition(y);
        return comp.NUM1.value % comp.NUM2.value;
    },
    "v5_operator_function_atan2": (y) => {
        let comp = getComposition(y);
        return Math.atan2(comp.NUM1.value,comp.NUM2.value);
    },
    "v5_operator_add": (y) => {
        let comp = getComposition(y);
        return comp.NUM1.value + comp.NUM2.value;
    },
    "v5_operator_subtract": (y) => {
        let comp = getComposition(y);
        return comp.NUM1.value - comp.NUM2.value;
    },
    "v5_operator_multiply": (y) => {
        let comp = getComposition(y);
        return comp.NUM1.value * comp.NUM2.value;
    },
    "v5_operator_divide": (y) => {
        let comp = getComposition(y);
        return comp.NUM1.value / comp.NUM2.value;
    },
    "procedures_definition": (y) => {
        let comp = getComposition(y);
        let mutateele = y.children[0].children[0].children[0];
        let names = JSON.parse(mutateele.argumentnames);
        functions[mutateele.getAttribute("proccode")] = () => {
            while (y.lastChild.nodeName == "NEXT" && running == true) {
                y = y.lastChild.children[0];
                if (!is_brain(y)) { continue; }
                function_list[y.getAttribute("type")](y);
            }
        }
    },
    "math_whole_number": (y) => {
        let comp = getComposition(y);
        return Number(comp.NUM.value);
    },
    "text": (y) => {
        return y.innerText;
    },
    "math_number": (y) => {
        return Number(y.innerText);
    },
    "math_positive_number": (y) => {
        return Number(y.innerText);
    }
}