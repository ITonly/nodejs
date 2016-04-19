var a=1;
function fn(){
    var b;
    var c=3;
    fn2();
    function fn2(){
        console.log(a);
        console.log(c);
    }
    b=2;
   // fn2();
    c=3;
}
fn();