CORE = (function(){

var logwin = null;
function log(message) {
  if (!logwin) logwin = document.getElementById("conout");
  if (logwin) logwin.value += message;
  else alert("Couldn't find log window");
}

function getStringIn(input, msg) {
  while (input.length) {
    var res = input[0];
    input.splice(0,1);
    if (res.length > 0)
      return  { car: res, cdr: input };
  }
  return { car: prompt(msg), cdr: [] };
}
function getInput(input, msg) {
  var res = getStringIn(input, msg);
  if (!res.car.match(/[0-9]+/))
    throw("Input error: Please input only integers. In an input file, they must be separated by whitespace.");
  res.car = parseInt(res.car);
  return res;
}

function strrep(str, reps) {
  var res = "";
  for (var j = 0; j < reps; ++j)
    res += " ";
  return res;
}

/**
 * This is the default print function. It handles all aspects of pretty-printing a rule.
 * @param ast    The AST to be printed.
 * @param ops    The printer operations; these are passed from function to function by the BNF backend.
 * @param spaces An array of strings to use in place of whitespace tokens from the AST.
 * @param inds   An array of indentation levels to apply to each rule in the given AST.
 * @param rinds  An array of booleans denoting whether to respect the current indentation level.
 */
function defprint(ast, ops, spaces, inds, rinds) {
  var res = "", spc = 0, indc = 0, rindc = 0, rind;
  spaces = (spaces && spaces.length)? spaces : (console.log("ERROR: " + spaces), [' ']);
  inds = inds || [];
  rinds = rinds || [];
  if (ast.type == "rule")
    for (var i = 0; i < ast.ast.length; ++i)
      if (ast.ast[i].type == "rule") {
        var indo = ind;
        if (indc < inds.length)
          ind += inds[indc++];
        if (rindc < rinds.length && (rind = rinds[rindc++]))
          res += strrep(" ", ind);
        res += operate(ast.ast[i], ops);
        ind = indo;
      }
      else if (ast.ast[i].type == "token") {
        if (rindc < rinds.length && (rind = rinds[rindc++]))
          res += strrep(" ", ind);
        res += ast.ast[i].name;
      }
      else res += spc < spaces.length? spaces[spc++] : spaces[spaces.length - 1];
  return res;
}

/**
 * This is the printer dictionary; it is used by the BNF backend to locate rules for each AST node.
 * The backend looks up the name of the rule in this dictionary, and then runs the function it finds
 * on the given AST. These functions will make recursive calls back to operate() as needed.
 */
printer = {
  indents:      ind = 0, ///< This is the amount of indentation used in recurring levels of the pretty-printer; it must be a member of ops so it can be passed through bnf.operate().
  operate:      operate = bnf.operate,
  generic:      defprint,
  "<prog>":     function(ast, ops) { return defprint(ast, ops, [' ', '\n', '\n', ''], [0, 2]); },
  "<decl seq>": function(ast, ops) { return defprint(ast, ops, ['\n']); },
  "<stmt seq>": function(ast, ops) { return defprint(ast, ops, ['\n'], [], [1]) + (ast.ind? "\n" : ""); },
  "<decl>":     function(ast, ops) { return defprint(ast, ops, [' ', '']); },
  "<id list>":  function(ast, ops) { return defprint(ast, ops, ['', ' ']); },
  "<stmt>":     defprint, // This is just a big OR of other rules.
  "<assign>":   function(ast, ops) { return defprint(ast, ops, [' ', ' ', '']); },
  "<if>":       function(ast, ops) { return defprint(ast, ops, [' ', ' ', '\n', '', '\n', ''], [0, 2, 2], [0, 0, 0, 0, 1, 0, 1]); },
  "<loop>":     function(ast, ops) { return defprint(ast, ops, [' ', ' ', '\n', ''], [0, 2, 2], [0, 0, 0, 0, 1]); },
  "<input>":    function(ast, ops) { return defprint(ast, ops, [' ', '']); },
  "<output>":   function(ast, ops) { return defprint(ast, ops, [' ', '']); },
  "<cond>":     function(ast, ops) { return defprint(ast, ops, ['', ' ', ' ', '']); },
  "<comp>":     function(ast, ops) { return defprint(ast, ops, ['', ' ', ' ', '']); },
  "<exp>":      defprint, "<fac>":      defprint, // For these rules, all spaces are regular spaces.
  "<op>":       defprint, "<comp op>":  defprint, // These are operators, with no spaces
  "<id>":       defprint, "<int>":      defprint, // These rules concatenate two other rules without spaces.
  "<let>":      defprint, "<digit>":    defprint, // These are single characters, with no spaces
}


/* ****************************************************************************************************************** *
 *  It isn't necessarily the case that the correct grammar was used to build the AST, so these functions help ensure  *
 * that whatever grammar was used, we can operate on the grammar or report errors accurately otherwise.               *
 * ****************************************************************************************************************** */

  /// This function is called when a rule is encountered which should have been handled by another rule.
  function badRule(rule) {
    throw("Internal error: attempted to perform operation on " + (rule? rule.name? rule.name : "invalid rule" : "undefined rule")
        + ", which should not happen"); 
  }
  /// This function is called to ensure that an AST node is actually a rule.
  function assertRule(rule) {
    if (!rule || rule.type != "rule")
      throw("Internal error: " +
        (rule? rule.type == "white"? "rule expected, whitespace found"
           : rule.name? "`" + rule.name + "' should have been a rule" 
           : "anonymous rule; not a rule" : "undefined rule: not in tree"));
  }
  /// This function is called to ensure that an AST node is the token the interpreter thinks it is.
  function assertToken(ast, ind, name) {
    if (!ast || ast.type != "rule" || !ast.ast)
      throw("Internal error: " + (ast? ast.name? ast.name : "anonymous rule" : "undefined rule") + " does not contain expected token");
    if (!ast.ast[ind] || !ast.ast[ind].name || ast.ast[ind].name != name || ast.ast[ind].type != "token")
      throw("Internal error: expected token `" + name + "' in rule `" + ast.name + "' was not found");
  }
  /// This function is called to ensure that an AST node is whitespace, and so safe to ignore.
  function assertWhite(ast, ind) {
    if (!ast || ast.type != "rule" || !ast.ast)
      throw("Internal error: " + (ast? ast.name? ast.name : "anonymous rule" : "undefined rule") + " does not contain expected token");
    if (!ast.ast[ind] || ast.ast[ind].type != "white")
      throw("Internal error: unexpected pattern in rule `" + ast.name + "': white space expected");
  }
  /// This function is called on an arbitrary AST node which may not exist; it ensures that the node exists,
  /// and that it is a rule, and then it invokes the rule's handler method.
  function operateRule(rule, ops, defined) {
    if (!defined && !rule) return 0;
    assertRule(rule);
    return operate(rule, ops);
  }
  /// This function ensures that a result is, in fact, an array of some length.
  function assertArray(arr, lower, upper, kind) {
    if (!arr || !arr.length || arr.length < lower || (upper != -1 && arr.length > upper))
      throw("Internal error: " + kind + " does not have expected length (" + (arr? arr.length : "null") + " should be " +
        (upper == lower? lower : upper == -1? "at least " + lower : "between " + upper + " and " + lower) + ")");
    return [].concat(arr);
  }
  function nonnull(x, item) {
    if (x == null)
      throw("Internal error: " + item + " should not be null");
    return x;
  }

/* *********************************************************************** *
 * Here begins the actual interpreter code.                                *
 * *********************************************************************** */

/** This maps CORE operator strings to their corresponding JavaScript equivalents. */
var operators = {
  ">=": function(x, y) { return x >= y; },   "+":  function(x, y) { return x  + y; },
  "<=": function(x, y) { return x <= y; },   "-":  function(x, y) { return x  - y; },
  "==": function(x, y) { return x == y; },   "*":  function(x, y) { return x  * y; },
  "!=": function(x, y) { return x != y; },   ">":  function(x, y) { return x  > y; },
  "&&": function(x, y) { return x && y; },   "<":  function(x, y) { return x  < y; },
  "or": function(x, y) { return x || y; }
};

function do_operator(op, x, y) {
  if (op in operators)
    return operators[op](x, y);
  throw("Internal error: Unrecognized CORE operator `" + op + "'");
}

/**
 * This is the interpreter dictionary; it's similar to the printer one, above, but actually executes the code.
 */
interpreter = {
  symbols:
    symbolTable = {},
  symExist:
    assertSymbolExists = function(sym) {
      if (!(sym in symbolTable))
        throw("Program error: Variable `" + sym + "' has not been declared");
    },
  input: "", // This allows the caller to inject input
  generic:
    function(ast, ops) {
      if (!ast || ast.name != "<>") // This is our try-all rule that allows any rule in the program.
        throw("Internal error: Invalid rule to interpret: " + (ast? ast.name : "(no rule passed)") + ": Rule not found");
      assertArray(ast.ast, 1, 1, "AST");
      if (ast.ast[0].name != "<prog>")
        throw("Mechanics error: A CORE program must begin with `program'");
      symbolTable = {};
      ops.input = ops.input.split(/[\s\n]+/);
      console.log(ops.input);
      return operate(ast.ast[0], ops);
    },
  evalSeq: // Function to evaluate every rule in an AST, sequentially.
    evalSeq = function(ast, ops) {
      var res = null;
      for (var i = 0; i < ast.ast.length; ++i)
        if (ast.ast[i].type == "rule")
          res = operate(ast.ast[i], ops);
      return res;
    },
  
  // These four rules evaluate their children sequentially; there's nothing special to do for them.
  "<prog>":     evalSeq,
  "<decl seq>": evalSeq,
  "<stmt seq>": evalSeq,
  "<stmt>":     evalSeq,
  
  // These rules are for working with variable names
  "<decl>": // Declares variables, adding them to our symbol table.
    function(ast, ops) {
      assertToken(ast, 0, "int");
      assertWhite(ast, 1);
      var ids = operateRule(ast.ast[2], ops, true);
      if (!ids || !ids.length || ids.length < 1)
        throw("Internal error: empty ID list?");
      for (var i = 0; i < ids.length; ++i)
        symbolTable[ids[i]] = null; // Declare, but do not initialize
    },
  "<id list>": // Returns an array of IDs.
    function(ast, ops) {
      var res = assertArray(operateRule(ast.ast[0], printer, true), 1, -1, "ID list");
      if (ast.ast.length > 1) {
        assertWhite(ast, 1); assertWhite(ast, 3);
        assertToken(ast, 2, ',');
        var ida = operateRule(ast.ast[4], ops, true);
        var rest = assertArray(ida, 1, -1, "ID list");
        for (var i = 0; i < rest.length; ++i)
          res.push(rest[i]);
      }
      return res;
    },
  "<assign>":
    function(ast, ops) {
      var id = operateRule(ast.ast[0], printer, true); // This just asks the printer to print the variable name. Terrible, eh?
      assertSymbolExists(id); // Make sure it's in our symbol table
      assertWhite(ast, 1);
      assertToken(ast, 2, "=");
      assertWhite(ast, 3);
      var val = operateRule(ast.ast[4], ops, true);
      return symbolTable[id] = val;
    },
  
  // These are the rules moving actual code.
  "<if>":
    function(ast, ops) {
      assertToken(ast, 0, "if");
      assertWhite(ast, 1);
      var cond = operateRule(ast.ast[2], ops, true);
      assertWhite(ast, 3);
      assertToken(ast, 4, "then");
      assertWhite(ast, 5);
      if (cond)
        return operateRule(ast.ast[6], ops, true);
      assertWhite(ast, 7);
      // Token 8 is else, 9 is white, and 10 is the else code, if ind = 1
      if (ast.ind)
        return operateRule(ast.ast[10], ops, false); // The else code is optional.
    },
  "<loop>":
    function(ast, ops) {
      assertToken(ast, 0, "while");
      assertWhite(ast, 1);
      assertWhite(ast, 3);
      assertToken(ast, 4, "loop");
      assertWhite(ast, 5);
      assertWhite(ast, 7);
      assertToken(ast, 8, "end");
      var res = 0;
      while (operateRule(ast.ast[2], ops, true))
        res = operateRule(ast.ast[6], ops, true);
      return res;
    },
  "<input>":
    function(ast, ops) {
      assertToken(ast, 0, "read"); assertWhite(ast, 1);
      var vars = assertArray(operateRule(ast.ast[2], ops, true), 1, -1, "ID list");
      for (var i = 0; i < vars.length; ++i) {
        var val = getInput(ops.input, "Please input " + vars[i] + ":");
        symbolTable[vars[i]] = val.car;
      }
    },
  "<output>":
    function(ast, ops) {
      assertToken(ast, 0, "write"); assertWhite(ast, 1);
      var vars = assertArray(operateRule(ast.ast[2], ops, true), 1, -1, "ID list");
      var maxlen = 0, msg = "";
      for (var i = 0; i < vars.length; ++i)
        maxlen = Math.max(maxlen, vars[i].length);
      for (var i = 0; i < vars.length; ++i)
        msg += strrep(" ", maxlen - vars[i].length) + vars[i] + " = " + symbolTable[vars[i]] + "\n";
      log(msg);
      return 0;
    },
  "<cond>": 
    function(ast, ops) {
      switch (ast.ind) {
        case 0: // <comp>
          return operateRule(ast.ast[0], ops, true);
        case 1: // !<cond>
          assertToken(ast, 0, "!");
          assertWhite(ast, 1);
          return !operateRule(ast.ast[2], ops, true);
        case 2: // [<cond> && <cond>]
          assertToken(ast, 0, "["); assertWhite(ast, 1); assertWhite(ast, 3); assertToken(ast, 4, "&&"); assertWhite(ast, 5);
          return operateRule(ast.ast[2], ops, true) && operateRule(ast.ast[6], ops, true);
        case 3: // [<cond> or <cond>]
          assertToken(ast, 0, "["); assertWhite(ast, 1); assertWhite(ast, 3); assertToken(ast, 4, "or"); assertWhite(ast, 5);
          return operateRule(ast.ast[2], ops, true) || operateRule(ast.ast[6], ops, true);
      }
      throw("Internal error: Condition does not have expected format");
    },
  "<comp>":
    function(ast, ops) {
      assertToken(ast, 0, "(");
      assertWhite(ast, 1); assertWhite(ast, 3);
      assertWhite(ast, 5); assertWhite(ast, 7);
      assertToken(ast, 8, ")");
      return do_operator(operateRule(ast.ast[4], ops, true), operateRule(ast.ast[2], ops, true), operateRule(ast.ast[6], ops, true));
    },
  "<exp>":
    function(ast, ops) {
      if (ast.ast.length == 1)
        return operateRule(ast.ast[0], ops, true);
      assertWhite(ast, 1); assertWhite(ast, 3);
      return do_operator(ast.ast[2].name, operateRule(ast.ast[0], ops, true), operateRule(ast.ast[4], ops, true));
    },
  "<fac>":
    function(ast, ops) {
      if (ast.ast.length == 1)
        return operateRule(ast.ast[0], ops, true);
      assertWhite(ast, 1); assertWhite(ast, 3);
      return do_operator(ast.ast[2].name, operateRule(ast.ast[0], ops, true), operateRule(ast.ast[4], ops, true));
    },
  "<op>":
    function(ast, ops) {
      if (ast.ast.length == 1)
        return operateRule(ast.ast[0], ops, true);
      assertToken(ast, 0, "(");
      assertWhite(ast, 1);
      assertWhite(ast, 3);
      assertToken(ast, 4, ")");
      return operateRule(ast.ast[2], ops, true);
    },
  "<id>":
    function(ast, ops) {
      var id = operate(ast, printer);
      assertSymbolExists(id);
      var res = symbolTable[id];
      if (res == null)
        throw("Program error: Attempting to use a variable that has been declared, but not assigned");
      return res;
    },
  "<int>":
    function(ast, ops) {
      var num = operate(ast, printer);
      if (!num.match(/[0-9]+/))
        throw("Internal error: number is not numeric");
      if (num == "0") return 0;
      return parseInt(num, 10);
    },
  "<comp op>":  function(ast, ops) { assertArray(ast.ast, 1, 1, "AST"); return nonnull(ast.ast[0].name); },
  "<let>":      badRule,
  "<digit>":    badRule
};

return { interpreter: interpreter, printer: printer };
})();
