#!/usr/bin/env perl
# Used by guard-bash.sh: prints the protected path a shell command writes to, or nothing.
#   perl protected-writes.pl <command> <repo root>
# Globs in .claude/protected-paths.txt are read as path prefixes (a trailing /* or * is dropped).
# A path matches in its relative, ./ and absolute spelling, and by its trailing components
# (prisma/migrations after a cd); deletes and moves also match its parent folders. The sanctioned
# generators (prisma migrate, shadcn add, db:migrate) may write there.
# Guardrail, not sandbox: a path held in a variable, or a one-component path after a cd
# (cd apps/web/components && rm -rf ui), slips through.
use strict;
use warnings;

my ($cmd, $root) = @ARGV;
open my $fh, '<', "$root/.claude/protected-paths.txt" or exit 0;
my (@alts, @parents);
while (my $p = <$fh>) {
  chomp $p;
  next if $p =~ /^\s*(?:#|$)/;
  $p =~ s{/?\*+$}{};
  my @c = split m{/}, $p;
  push @alts, map { quotemeta join '/', @c[$_ .. $#c] } 0 .. ($#c > 0 ? $#c - 1 : 0);
  push @parents, map { quotemeta join '/', @c[0 .. $_] } 0 .. $#c - 1;
}
exit 0 unless @alts;
my $edge = q{(?<![\w./-])(?:\./)?};
my $path = $edge . q{(?:} . join('|', @alts) . q{)(?=/|\s|$)[^\s'",;)]*};
my $tree = @parents ? qr{$path|$edge(?:@{[join '|', @parents]})/?(?=\s|$)} : qr{$path};

$cmd =~ s/\Q$root\E\///g;
# Heredoc bodies are data, except for the interpreters that run them: keep each body aside
# behind a \x01N\x01 marker on its heredoc line.
my @bodies;
(my $view = $cmd) =~ s/<<-?[ \t]*(["']?)(\w+)\1([^\n]*)\n(.*?)^[ \t]*\2[ \t]*$/push @bodies, $4; "\x01$#bodies\x01$3"/gmse;
# Quoted text is data too (commit messages, PR bodies): blank its shell operators so it neither
# splits a command nor reads as a redirect, then drop the quote characters so a quoted path still
# counts. Not when the command runs a string as code (sh -c, eval).
unless ($view =~ /(?:^|[^\w])(?:(?:ba|z)?sh\s+-\w*c|eval)(?:\s|$)/) {
  $view =~ s/("(?:[^"\\]|\\.)*"|'[^']*')/(my $q = $1) =~ tr{<>|;&\n}{ }; $q/ge;
}
$view =~ tr/"'//d;

for my $s (split /\|\||&&|;|\n|(?<!>)\||(?<!>)&(?!>)/, $view) {
  1 while $s =~ s/^(?:[\s({!]+|(?:then|do|else|elif|if|while|until|time|exec|command|sudo|env|nice|nohup)\s+|timeout\s+\S+\s+|\w+=\S*\s+)//;
  next if $s =~ /^(?:(?:pnpm|npm|yarn)(?:\s+(?:--filter|-F)[=\s]\S+)?(?:\s+(?:exec|dlx|run))?\s+|p?npx\s+)?(?:prisma\s+migrate|shadcn(?:@\S*)?\s+add|db:migrate)(?:\s|$)/;
  my ($prog) = $s =~ /^(\S+)/ or next;
  $prog =~ s{.*/}{};
  (my $w = $s) =~ s/\x01(\d+)\x01//g;
  if ($prog =~ /^(?:python3?|node|ruby|perl)$/) {
    (my $run = $s) =~ s/\x01(\d+)\x01/ $bodies[$1] /g;
    if ($run =~ /($path)/) { print $1; exit 0 }
  }
  if ($w =~ />[>|]?\s*($path)/
      || ($prog =~ /^(?:cp|install|ln|rsync)$/
          && ($w =~ /\s(?:-t\s*|--target-directory[=\s])($path)/
              || (grep { !/>/ } split ' ', $w)[-1] =~ /^($path)$/))
      || ($prog eq 'dd' && $w =~ /\sof=($path)/)
      || ($prog =~ /^(?:tee|touch|truncate)$/ && $w =~ /($path)/)
      || (($prog =~ /^(?:mv|rm|rmdir|unlink|shred)$/
           || ($prog eq 'find' && $w =~ /\s-(?:delete|exec|execdir|ok)\b/)
           || ($prog eq 'git' && $w =~ /^git(?:\s+-C\s+\S+)?\s+(?:rm|mv|checkout|restore|clean)\s/)
           || ($prog =~ /^(?:sed|perl)$/ && $w =~ /\s(?:-[a-zA-Z]*i|--in-place)/))
          && $w =~ /($tree)/)) {
    print $1;
    exit 0;
  }
}
