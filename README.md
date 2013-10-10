RUNNING
###########
Please open index.html in Firefox or Chromium, or any HTML- and ECMA-compliant browser. This excludes ELinks. The version of Links available on the stdlinux cluster is a scriptless version of ELinks, and so is not suited to run this program. However, any compliant browser on any operating system is.

In the event that you are accessing this file via secure shell, I recommend you do any of the following:

1) Switch to SFTP and copy the files to your computer, then open index.htm in your favorite browser.

2) Move the file to your student website
  1. Run the following commands:
      mkdir -p ~/WWW/cse655-lab1-JoshVentura/
      cp * ~/WWW/cse655-lab1-JoshVentura/
      chmod -R 755 ~/WWW/JS-BNF/
  2. In your browser, access the files via http://www.cse.ohio-state.edu/~YOURUSERNAME/cse655-lab1-JoshVentura/
  3. Delete the files when you are done
      rm -rf ~/WWW/cse655-lab1-JoshVentura
  4. Open index.htm in your favorite browser.

3) Alternatively, you can run the files from my own student site. http://www.cse.ohio-state.edu/~venturaj/JS-BNF

Once you have the file open, you can run it on an arbitrary grammar entered in the box with the placeholder text, "BNF Here" (by default, it contains CORE's BNF). The grammar is run on the input in the box with the placeholder, "String to parse here" (by default, a simple CORE program).

From there, a tree is built and added to the box labeled "Output goes here."

Finally, the content of the third input box is read in. This box contains a JSON fragment describing the functions required to print the tokens from the tree as integers, as specified in the lab requirements.


DESIGN
###########
Rather than parse a specific grammar by creating functions to handle each rule, this project parses a BNF grammar, then generates a parse tree using the rules of that grammar. As a result, the project produces *concrete* parse trees. For the purpose of this lab, that is useful, as the individual items in the parse tree can be looked up against a map of each token to its number (more on this below).

The code which generates the trees from BNF is reasonably well-documented. About a third of the lines in the main file are comments explaining individual functions, which are themselves commented reasonably well.

Recursive operations on trees are performed by defining a JavaScript object which maps a function to each rule name. Rules which have not been mapped to a function are passed to the "generic" function. So, consider the supplied printtokens.json:

generic: function(ast, ops) {
  res = "";
  if (ast.type == "rule")
    for (var i = 0; i < ast.ast.length; ++i)
      res += (res.length? " ":"") + operate(ast.ast[i], ops);
  else if (ast.type == "token")
    res = ({ "program": 01, "begin":   02, ... ">=": 30 })[ast.name];
  return res;
},
"<id>":  function(id, ops) { return 32; },
"<int>": function(id, ops) { return 31; }

The "generic" function tests if the given AST subtree actually is a rule. If it is, the function delegates to that rule, and the returned string of tokens is added to its own result.
If the AST subtree passed to the generic function is instead a token, its index is looked up in a map of token names to token values, as given in the lab requiremenst.
The rules "<id>" and "<int>" are special; since they contain a subtree of nonsense, they are replaced with fuctions which simply return 32 and 31, respectively, such that they appear to be a single token of the correct index.


FILES
###########
README.md:         That's this file.
index.htm:         The main page you can open in a web browser to interact with this parser. Also contains the code that prints the token IDs; you can view and edit that code in your browser.
bnfparser.js:      The main source file; handles parsing and interpreting BNF rules to generate parse trees.
core.bnf:          The BNF grammar included in index.htm; a modified version of the grammar distributed by Dr. Soundarajan (see Remarks section).
printtokens.json:  The JSON fragment included in index.htm. Contains functions which, when passed to bnf.operate() (bnfparser.js), print all the tokens in the parse tree.
sample.core:       A simple CORE program sample.


CAVEATS
###########
Error checking is extremely approximate. Since this parser works for general BNF strings, it does backtracking. Therefore, it isn't possible to know whether the current production's expectation of the input is valid to report errors on. To work around this, all productions report their own errors, and a heuristic value is assigned to each error based on how many tokens were correctly read. The production which had consumed the most characters before ultimately failing is reported. In the event of a tie, multiple errors are reported, separated by an OR.

ERRATA
###########
It isn't entirely true, of course, that this parser is not affected by left recursion. Left recursion is dealt with by limiting the length of production paths which do not consume any characters. Thus, rules which require more than about eighty "useless" recursions will result in the failure of a perfectly valid string to parse. In the typical use case, this should never happen.

REMARKS
###########
The input must be syntactically valid CORE code. In the event that this is problematic, you could work around it by constructing a grammar which just lists all of the tokens and special symbols, instead, like this:

<stuff>  ::= <etc> <stuff> | <etc>
<etc>    ::= program | begin | end | int | if | then | else | while | loop | read | write | ; | , | = | ! | [ | ] | && | &pipe;&pipe; | ( | ) | + | - | * | != | == | < | > | <= | >= | <int> | <id>
<id>     ::= <let> | <let><id> | <let><int>
<let>    ::= A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X | Y | Z
<int>    ::= <digit> | <digit><int>
<digit>  ::= 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

If you need to run a set of test cases on this system which are *not* valid CORE programs, by all means, use the above grammar instead of the supplied CORE grammar.

The supplied CORE grammar, on that note, has been modified from the original grammar as distributed by Dr. Soundarajan.
  1) This grammar includes additional spaces between some rule pairings.
     The exception to this is occurrances of "end;". Since "end;" was left as a single word, it is interpreted as a single token. Thus, "end ;" is not a vaild substitution. In the (likely) event that this was not a deliberate decision, spaces should be added there. In the meantime, to ensure the success of this lab, the token "end;" simply prints both numbers.
  2) The rules for <let> and <digit> are described completely. This BNF parser is not governed by an AI, and cannot infer that A|B|C|D|...|X|Y|Z is actually the whole alphabet.
  3) The rule for <stmt> was modified to include a production for <output>. This was plum missing from Dr. Soundarajan's slides, which caused my parser to fail on his test case.
  4) I accidentally included rules for <select> as given on my last homework assignment. I used this parser to test them out before submitting the assignment, and never removed them. They're kind of neat, and aren't hurting anything.

TEST CASES
###########

program int X; begin
  X = 10;
  if (X == 5) then
    X = 7;
  else
    X = 10;
  end;
  select
    (X == 10) -> X = X * 2 + 4 * 3;
  end;
  write X;
end


