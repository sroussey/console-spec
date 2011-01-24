#!/usr/bin/perl

#my $dir = "/Projects/W3C/respec2/build";
my $ttSrc = "../../../Template.js/template/lib/Template.js";
my $reqSrc = "../js/require-req+jq.js";
my $ttLocal = "../js/Template.js";
my $ttMin = "../js/Template-min.js";

my $idlSrc = "../../../webidl.js/web/WebIDLParser.js";
my $idlLocal = "../js/WebIDLParser.js";
my $idlMin = "../js/WebIDLParser-min.js";

my $target = "../js/require.js";

# cp template
# minify
# join the two
# store

my $old = chdir($dir);
print `cp $ttSrc $ttLocal`;
unlink $ttMin;
print `minify $ttLocal`;

print `cp $idlSrc $idlLocal`;
unlink $idlMin;
print `minify $idlLocal`;

print `cp $reqSrc $target`;
print `cat $ttMin >> $target`;
print `cat $idlMin >> $target`;

chdir($old);
